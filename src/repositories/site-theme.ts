import { eq } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { siteSettingsTable, type SiteThemeSettings } from "@/db/schema";
import { DEFAULT_THEME_ID, getTheme, isThemeId, listThemes } from "@/lib/themes/registry";
import { sanitizeThemeSettings } from "@/lib/themes/resolve";
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

function toState(row: {
  themeId: string;
  themeSettings: SiteThemeSettings;
  updatedAt: Date | null;
}): SiteThemeState {
  const theme = getTheme(row.themeId);
  return {
    themeId: theme.id,
    themeSettings: sanitizeThemeSettings(row.themeSettings),
    themes: listThemes().map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      colorScheme: item.colorScheme,
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

    const [updated] = await db
      .update(siteSettingsTable)
      .set({
        themeId: nextThemeId,
        themeSettings: nextSettings,
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
      data: toState(updated),
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
