import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";
import type { ThemeColorScheme, ThemeSettings } from "@/lib/themes/types";

export type ThemeListItem = {
  id: string;
  name: string;
  description: string;
  defaultColorScheme: ThemeColorScheme;
  suggestedLayoutName: string | null;
};

export type SiteThemeState = {
  themeId: string;
  themeSettings: ThemeSettings;
  /** Resolved scheme (settings override or theme default). */
  colorScheme: ThemeColorScheme;
  defaultLayoutBlockId: string | null;
  defaultLayoutBlockName: string | null;
  themes: ThemeListItem[];
  updatedAt: Date | string | null;
};

export type SiteThemeResponse =
  | ApiSuccessResponse<SiteThemeState>
  | ApiErrorResponse;
