import { and, eq, isNull } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { blocksTable, siteSettingsTable } from "@/db/schema";
import type { SiteThemeSettings } from "@/db/schema.types";
import {
  DEFAULT_THEME_ID,
  getTheme,
  isThemeId,
  listThemes,
} from "@/lib/themes/registry";
import {
  resolveThemeColorScheme,
  sanitizeThemeSettings,
} from "@/lib/themes/resolve";
import type { ThemeSettings } from "@/lib/themes/types";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";
import type { SiteThemeState } from "@/responses/themes";

export const SITE_THEME_CACHE_TAG = "site-theme";

const SITE_SETTINGS_KEY = "default";

async function readSiteSettingsRow() {
  const existing = await db.query.siteSettingsTable.findFirst({
    where: eq(siteSettingsTable.key, SITE_SETTINGS_KEY),
  });

  if (existing) return existing;

  const [created] = await db
    .insert(siteSettingsTable)
    .values({
      key: SITE_SETTINGS_KEY,
      themeId: DEFAULT_THEME_ID,
      themeSettings: {},
    })
    .onConflictDoNothing({ target: siteSettingsTable.key })
    .returning();

  if (created) return created;

  const again = await db.query.siteSettingsTable.findFirst({
    where: eq(siteSettingsTable.key, SITE_SETTINGS_KEY),
  });
  if (!again) {
    throw new Error("Failed to ensure site_settings row");
  }
  return again;
}

async function layoutBlockMeta(id: string | null | undefined): Promise<{
  id: string | null;
  name: string | null;
}> {
  if (!id) return { id: null, name: null };
  const row = await db.query.blocksTable.findFirst({
    where: and(
      eq(blocksTable.id, id),
      eq(blocksTable.canBeLayout, true),
      isNull(blocksTable.deletedAt),
    ),
    columns: { id: true, name: true },
  });
  if (!row) return { id: null, name: null };
  return { id: row.id, name: row.name };
}

async function findLayoutBlockIdByName(name: string): Promise<string | null> {
  const row = await db.query.blocksTable.findFirst({
    where: and(
      eq(blocksTable.name, name),
      eq(blocksTable.canBeLayout, true),
      isNull(blocksTable.deletedAt),
    ),
    columns: { id: true },
  });
  return row?.id ?? null;
}

async function toState(row: {
  themeId: string;
  themeSettings: SiteThemeSettings;
  defaultLayoutBlockId: string | null;
  updatedAt: Date | null;
}): Promise<SiteThemeState> {
  const theme = getTheme(row.themeId);
  const settings = sanitizeThemeSettings(row.themeSettings);
  const layout = await layoutBlockMeta(row.defaultLayoutBlockId);
  return {
    themeId: theme.id,
    themeSettings: settings,
    colorScheme: resolveThemeColorScheme(theme.id, settings),
    defaultLayoutBlockId: layout.id,
    defaultLayoutBlockName: layout.name,
    themes: listThemes().map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      defaultColorScheme: item.defaultColorScheme,
      suggestedLayoutName: item.suggestedLayoutName ?? null,
    })),
    updatedAt: row.updatedAt,
  };
}

async function loadSiteThemeUncached(): Promise<SiteThemeState> {
  const row = await readSiteSettingsRow();
  return toState(row);
}

/** Cached public/editor read of the active theme selection. */
export function getCachedSiteTheme(): Promise<SiteThemeState> {
  return unstable_cache(loadSiteThemeUncached, ["site-theme"], {
    tags: [SITE_THEME_CACHE_TAG],
  })();
}

export async function getSiteTheme(): Promise<
  ApiSuccessResponse<SiteThemeState> | ApiErrorResponse
> {
  try {
    const data = await getCachedSiteTheme();
    return { success: true, statusCode: 200, data };
  } catch {
    return {
      success: false,
      statusCode: 500,
      message: "Something went wrong while loading the site theme.",
    };
  }
}

export type UpdateSiteThemeInput = {
  themeId?: string;
  themeSettings?: ThemeSettings;
  /** Pass `null` to clear the site-wide default layout. */
  defaultLayoutBlockId?: string | null;
};

export async function updateSiteTheme(
  input: UpdateSiteThemeInput,
): Promise<ApiSuccessResponse<SiteThemeState> | ApiErrorResponse> {
  try {
    if (input.themeId !== undefined && !isThemeId(input.themeId)) {
      return {
        success: false,
        statusCode: 400,
        message: "Please choose a valid theme.",
        field: "themeId",
      };
    }

    const row = await readSiteSettingsRow();
    const nextThemeId = input.themeId ?? row.themeId;
    const nextSettings =
      input.themeSettings !== undefined
        ? sanitizeThemeSettings(input.themeSettings)
        : sanitizeThemeSettings(row.themeSettings);

    let nextLayoutId = row.defaultLayoutBlockId;

    if (input.defaultLayoutBlockId !== undefined) {
      if (input.defaultLayoutBlockId === null) {
        nextLayoutId = null;
      } else {
        const layout = await layoutBlockMeta(input.defaultLayoutBlockId);
        if (!layout.id) {
          return {
            success: false,
            statusCode: 400,
            message: "Choose a valid layout block.",
            field: "defaultLayoutBlockId",
          };
        }
        nextLayoutId = layout.id;
      }
    } else if (
      input.themeId !== undefined &&
      input.themeId !== row.themeId
    ) {
      // Applying a theme may swap the site default layout when a suggested
      // layout block exists — pages with their own blockId are untouched.
      const suggested = getTheme(nextThemeId).suggestedLayoutName;
      if (suggested) {
        const suggestedId = await findLayoutBlockIdByName(suggested);
        if (suggestedId) nextLayoutId = suggestedId;
      }
    }

    if (nextLayoutId) {
      const stillValid = await layoutBlockMeta(nextLayoutId);
      if (!stillValid.id) nextLayoutId = null;
    }

    const [updated] = await db
      .update(siteSettingsTable)
      .set({
        themeId: nextThemeId,
        themeSettings: nextSettings,
        defaultLayoutBlockId: nextLayoutId,
        updatedAt: new Date(),
      })
      .where(eq(siteSettingsTable.id, row.id))
      .returning();

    if (!updated) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while saving the site theme.",
      };
    }

    revalidateTag(SITE_THEME_CACHE_TAG, { expire: 0 });

    return {
      success: true,
      statusCode: 200,
      data: await toState(updated),
      message: "Theme updated.",
    };
  } catch {
    return {
      success: false,
      statusCode: 500,
      message: "Something went wrong while saving the site theme.",
    };
  }
}
