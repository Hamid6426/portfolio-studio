"use client";

export default function PublicPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_")
  ) {
    throw error;
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
      <h2 className="text-lg font-semibold">Page unavailable</h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        This page could not be rendered right now.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}
