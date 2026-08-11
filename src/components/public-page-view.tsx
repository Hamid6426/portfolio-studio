import type { PageSummary } from "@/responses/pages";

/** Public renderer for a CMS page (landing or slug). Blocks come later. */
export function PublicPageView({ page }: { page: PageSummary }) {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <main className="flex w-full max-w-3xl flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">{page.title}</h1>
        {page.description ? (
          <p className="text-lg leading-8 text-muted-foreground">
            {page.description}
          </p>
        ) : null}
      </main>
    </div>
  );
}
