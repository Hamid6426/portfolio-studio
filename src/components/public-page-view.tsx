import { renderBlockTree } from "@/components/page-editor/block-registry";
import type { PageSummary } from "@/responses/pages";
import type { BlockNode } from "@/db/schema";

type PublicPageViewProps = {
  page: PageSummary;
  layoutChildren?: BlockNode[];
  /** True when rendering the unpublished draft for a permitted user. */
  isPreview?: boolean;
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

/** Public renderer for a CMS page (landing or slug). */
export function PublicPageView({
  page,
  layoutChildren = [],
  isPreview = false,
}: PublicPageViewProps) {
  const hasContent =
    (layoutChildren?.length ?? 0) > 0 || (page.content?.length ?? 0) > 0;

  const banner = isPreview ? (
    <PreviewBanner isPublished={Boolean(page.publishedAt)} />
  ) : null;

  if (!hasContent) {
    return (
      <div className="flex flex-1 flex-col">
        {banner}
        <div className="flex flex-1 flex-col items-center px-6 py-16">
          <main className="flex w-full max-w-3xl flex-col gap-4">
            <h1 className="text-4xl font-semibold tracking-tight">
              {page.title}
            </h1>
            {page.description ? (
              <p className="text-lg leading-8 text-muted-foreground">
                {page.description}
              </p>
            ) : null}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {banner}
      {layoutChildren.length > 0 && (
        <div>{renderBlockTree(layoutChildren)}</div>
      )}
      {page.content.length > 0 && (
        <div>{renderBlockTree(page.content)}</div>
      )}
    </div>
  );
}
