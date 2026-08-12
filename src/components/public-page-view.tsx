import { renderBlockTree } from "@/components/page-editor/block-registry";
import { SiteThemeStyle } from "@/components/site-theme-style";
import type { PageSummary } from "@/responses/pages";
import type { BlockNode } from "@/db/schema.types";
import type { ThemeSettings } from "@/lib/themes/types";
import { cn } from "@/lib/utils";

type PublicPageViewProps = {
  page: PageSummary;
  layoutChildren?: BlockNode[];
  /** True when rendering the unpublished draft for a permitted user. */
  isPreview?: boolean;
  layoutUnreadable?: boolean;
  layoutUnsupportedVersion?: number;
  themeId: string;
  themeSettings?: ThemeSettings | null;
};

/** Makes it obvious the visitor is not looking at the live page. */
function PreviewBanner({ isPublished }: { isPublished: boolean }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      Draft preview — {isPublished
        ? "this page has unpublished changes."
        : "this page is not published yet."}{" "}
      Visitors do not see this.
    </div>
  );
}

function UnreadableContentPanel({
  label,
  version,
}: {
  label: string;
  version?: number;
}) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
      <p className="font-medium">{label} cannot be displayed</p>
      <p className="mt-1 text-muted-foreground">
        {version !== undefined
          ? `This content was saved with document version ${version}, which is newer than this app supports. Upgrade Portfolio Studio to view it.`
          : "This content uses a document version this app does not support. Upgrade Portfolio Studio to view it."}
      </p>
    </div>
  );
}

const skipLinkClassName = cn(
  "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50",
  "rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow-md ring-1 ring-border",
);

/** Public renderer for a CMS page (landing or slug). */
export function PublicPageView({
  page,
  layoutChildren = [],
  isPreview = false,
  layoutUnreadable = false,
  layoutUnsupportedVersion,
  themeId,
  themeSettings,
}: PublicPageViewProps) {
  const contentUnreadable = Boolean(page.contentUnreadable);
  const hasContent =
    !contentUnreadable &&
    !layoutUnreadable &&
    ((layoutChildren?.length ?? 0) > 0 || (page.content?.length ?? 0) > 0);

  const banner = isPreview ? (
    <PreviewBanner isPublished={Boolean(page.publishedAt)} />
  ) : null;

  const theme = (
    <SiteThemeStyle themeId={themeId} themeSettings={themeSettings} />
  );

  if (contentUnreadable || layoutUnreadable) {
    return (
      <div className="ps-site flex flex-1 flex-col">
        {theme}
        {banner}
        <a href="#main-content" className={skipLinkClassName}>
          Skip to main content
        </a>
        <div className="flex flex-1 flex-col items-center px-6 py-16">
          <main
            id="main-content"
            className="flex w-full max-w-3xl flex-col gap-4"
          >
            <h1 className="text-4xl font-semibold tracking-tight">
              {page.title}
            </h1>
            {contentUnreadable ? (
              <UnreadableContentPanel
                label="Page content"
                version={page.unsupportedVersion}
              />
            ) : null}
            {layoutUnreadable ? (
              <UnreadableContentPanel
                label="Layout block"
                version={layoutUnsupportedVersion}
              />
            ) : null}
          </main>
        </div>
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="ps-site flex flex-1 flex-col">
        {theme}
        {banner}
        <a href="#main-content" className={skipLinkClassName}>
          Skip to main content
        </a>
        <div className="flex flex-1 flex-col items-center px-6 py-16">
          <main
            id="main-content"
            className="flex w-full max-w-3xl flex-col gap-4"
          >
            <h1 className="text-4xl font-semibold tracking-tight">
              {page.title}
            </h1>
            {page.description ? (
              <p className="ps-muted text-lg leading-8">
                {page.description}
              </p>
            ) : null}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-site flex flex-1 flex-col">
      {theme}
      {banner}
      <a href="#main-content" className={skipLinkClassName}>
        Skip to main content
      </a>
      <main id="main-content" className="flex flex-1 flex-col">
        {layoutChildren.length > 0 && (
          <div>{renderBlockTree(layoutChildren)}</div>
        )}
        {page.content.length > 0 && (
          <div>{renderBlockTree(page.content)}</div>
        )}
      </main>
    </div>
  );
}
