"use client";

import { useMemo, useState } from "react";
import { Loader2Icon, PaletteIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteThemeStyle } from "@/components/site-theme-style";
import {
  canShowButton,
  PERMISSIONS,
  type Permission,
} from "@/config/permissions";
import { FONT_PRESETS } from "@/lib/themes/registry";
import {
  useSiteThemeQuery,
  useUpdateSiteThemeMutation,
} from "@/queries/themes";
import { useLayoutBlocksQuery } from "@/queries/blocks";
import { cn } from "@/lib/utils";

type ThemesPageClientProps = {
  permissions: Permission[] | string;
};

export function ThemesPageClient({ permissions }: ThemesPageClientProps) {
  const themeQuery = useSiteThemeQuery();
  const layoutBlocksQuery = useLayoutBlocksQuery();
  const updateMutation = useUpdateSiteThemeMutation();
  const canEdit = canShowButton(permissions, PERMISSIONS.themesEdit);

  const state = themeQuery.data?.success ? themeQuery.data.data : null;

  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [radius, setRadius] = useState<string | null>(null);
  const [sectionSpacing, setSectionSpacing] = useState<string | null>(null);
  const [fontBody, setFontBody] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState<"light" | "dark" | null>(
    null,
  );

  const layoutBlocks = useMemo(
    () =>
      layoutBlocksQuery.data?.success ? layoutBlocksQuery.data.data : [],
    [layoutBlocksQuery.data],
  );

  const settings = useMemo(() => {
    const base = state?.themeSettings ?? {};
    return {
      primaryColor: primaryColor ?? base.primaryColor ?? "",
      radius: radius ?? base.radius ?? "",
      sectionSpacing: sectionSpacing ?? base.sectionSpacing ?? "",
      fontBody: fontBody ?? base.fontBody ?? "",
      colorScheme: colorScheme ?? base.colorScheme ?? state?.colorScheme ?? "light",
    };
  }, [state, primaryColor, radius, sectionSpacing, fontBody, colorScheme]);

  const previewThemeId = state?.themeId ?? "developer";

  async function selectTheme(themeId: string) {
    if (!canEdit || updateMutation.isPending) return;
    const response = await updateMutation.mutateAsync({ themeId });
    if (!response.success) {
      toast.error(response.message);
      return;
    }
    const name =
      response.data.themes.find((t) => t.id === themeId)?.name ?? themeId;
    const layoutNote = response.data.defaultLayoutBlockName
      ? ` · default layout “${response.data.defaultLayoutBlockName}”`
      : "";
    toast.success(`Switched to ${name}${layoutNote}`);
  }

  async function saveSettings() {
    if (!canEdit || updateMutation.isPending) return;
    const response = await updateMutation.mutateAsync({
      themeSettings: {
        primaryColor: settings.primaryColor,
        radius: settings.radius,
        sectionSpacing: settings.sectionSpacing,
        fontBody: settings.fontBody,
        colorScheme: settings.colorScheme,
      },
    });
    if (!response.success) {
      toast.error(response.message);
      return;
    }
    setPrimaryColor(null);
    setRadius(null);
    setSectionSpacing(null);
    setFontBody(null);
    setColorScheme(null);
    toast.success("Theme settings saved");
  }

  async function saveDefaultLayout(blockId: string) {
    if (!canEdit || updateMutation.isPending) return;
    const response = await updateMutation.mutateAsync({
      defaultLayoutBlockId: blockId === "" ? null : blockId,
    });
    if (!response.success) {
      toast.error(response.message);
      return;
    }
    toast.success(
      response.data.defaultLayoutBlockName
        ? `Site default layout: ${response.data.defaultLayoutBlockName}`
        : "Site default layout cleared",
    );
  }

  if (themeQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading themes…
      </div>
    );
  }

  if (!state) {
    return (
      <p className="text-sm text-destructive">
        {themeQuery.data && !themeQuery.data.success
          ? themeQuery.data.message
          : "Could not load themes."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Themes</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Choose a portfolio theme. Tokens restyle the public site and the editor
          canvas. Page block trees stay as authored — use{" "}
          <code className="text-xs">var(--ps-…)</code> in block styles to follow
          the theme. Applying a theme can set the site default layout when a
          block named “Site shell” exists.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {state.themes.map((theme) => {
            const active = theme.id === state.themeId;
            return (
              <button
                key={theme.id}
                type="button"
                disabled={!canEdit || updateMutation.isPending}
                onClick={() => void selectTheme(theme.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-muted-foreground/40",
                  (!canEdit || updateMutation.isPending) && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{theme.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {theme.description}
                    </p>
                  </div>
                  <PaletteIcon className="size-4 shrink-0 opacity-60" />
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {theme.defaultColorScheme} default
                  {active ? " · active" : ""}
                </p>
              </button>
            );
          })}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>Active theme on a sample surface.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SiteThemeStyle
              themeId={previewThemeId}
              themeSettings={{
                primaryColor: settings.primaryColor || undefined,
                radius: settings.radius || undefined,
                sectionSpacing: settings.sectionSpacing || undefined,
                fontBody: settings.fontBody || undefined,
                colorScheme: settings.colorScheme,
              }}
            />
            <div className="ps-site m-4 rounded-lg border border-[color:var(--ps-border)] p-4">
              <p
                className="text-lg font-semibold"
                style={{ fontFamily: "var(--ps-font-heading)" }}
              >
                Sample heading
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--ps-muted)" }}>
                Body copy uses theme muted colour and spacing.
              </p>
              <div
                className="mt-4 inline-flex px-3 py-1.5 text-sm"
                style={{
                  background: "var(--ps-primary)",
                  color: "var(--ps-primary-foreground)",
                  borderRadius: "var(--ps-radius)",
                }}
              >
                Primary
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme settings</CardTitle>
          <CardDescription>
            Overrides apply on top of the selected theme. Leave a field empty to
            use the theme default.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-xl gap-4">
          <div className="grid gap-2">
            <Label>Colour scheme</Label>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((scheme) => (
                <Button
                  key={scheme}
                  type="button"
                  variant={
                    settings.colorScheme === scheme ? "default" : "outline"
                  }
                  size="sm"
                  disabled={!canEdit}
                  onClick={() => setColorScheme(scheme)}
                >
                  {scheme === "light" ? "Light" : "Dark"}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="theme-primary">Primary colour</Label>
            <Input
              id="theme-primary"
              value={settings.primaryColor}
              disabled={!canEdit}
              placeholder="Theme default"
              onChange={(event) => setPrimaryColor(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="theme-radius">Border radius</Label>
            <Input
              id="theme-radius"
              value={settings.radius}
              disabled={!canEdit}
              placeholder="e.g. 0.5rem"
              onChange={(event) => setRadius(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="theme-gap">Section spacing</Label>
            <Input
              id="theme-gap"
              value={settings.sectionSpacing}
              disabled={!canEdit}
              placeholder="e.g. 56px"
              onChange={(event) => setSectionSpacing(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="theme-font">Body font</Label>
            <select
              id="theme-font"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              disabled={!canEdit}
              value={settings.fontBody}
              onChange={(event) => setFontBody(event.target.value)}
            >
              <option value="">Theme default</option>
              {FONT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          {canEdit ? (
            <Button
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => void saveSettings()}
            >
              {updateMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Save settings
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site default layout</CardTitle>
          <CardDescription>
            Used on pages that have no layout of their own. Applying a theme
            sets this when a layout block named “Site shell” exists.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl">
          <div className="grid gap-2">
            <Label htmlFor="site-default-layout">Layout block</Label>
            <select
              id="site-default-layout"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              disabled={!canEdit || updateMutation.isPending}
              value={state.defaultLayoutBlockId ?? ""}
              onChange={(event) => void saveDefaultLayout(event.target.value)}
            >
              <option value="">None</option>
              {layoutBlocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
