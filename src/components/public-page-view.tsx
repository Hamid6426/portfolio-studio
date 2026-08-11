import { renderBlockTree } from "@/components/page-editor/block-registry";
import type { PageSummary } from "@/responses/pages";
import type { BlockNode } from "@/db/schema";

type PublicPageViewProps = {
  page: PageSummary;
  layoutChildren?: BlockNode[];
};

/** Public renderer for a CMS page (landing or slug). */
export function PublicPageView({
  page,
  layoutChildren = [],
}: PublicPageViewProps) {
  const hasContent =
    (layoutChildren?.length ?? 0) > 0 || (page.content?.length ?? 0) > 0;

  if (!hasContent) {
    return (
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
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {layoutChildren.length > 0 && (
        <div>{renderBlockTree(layoutChildren)}</div>
      )}
      {page.content.length > 0 && (
        <div>{renderBlockTree(page.content)}</div>
      )}
    </div>
  );
}
