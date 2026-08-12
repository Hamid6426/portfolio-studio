import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";
import type { ThemeSettings } from "@/lib/themes/types";

export type ThemeListItem = {
  id: string;
  name: string;
  description: string;
  colorScheme: "light" | "dark";
};

export type SiteThemeState = {
  themeId: string;
  themeSettings: ThemeSettings;
  themes: ThemeListItem[];
  updatedAt: Date | string | null;
};

export type SiteThemeResponse =
  | ApiSuccessResponse<SiteThemeState>
  | ApiErrorResponse;
