import { buildThemeStylesheet } from "@/lib/themes/resolve";
import type { ThemeSettings } from "@/lib/themes/types";

type SiteThemeStyleProps = {
  themeId: string;
  themeSettings?: ThemeSettings | null;
};

/**
 * Injects the active portfolio theme as a `<style>` block for `.ps-site`.
 * Prefer this over inline style attributes (public CSP sets `style-src-attr 'none'`).
 */
export function SiteThemeStyle({
  themeId,
  themeSettings,
}: SiteThemeStyleProps) {
  const css = buildThemeStylesheet(themeId, themeSettings);
  return <style data-ps-theme={themeId}>{css}</style>;
}
