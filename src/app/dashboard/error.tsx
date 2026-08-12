"use client";

export default function DashboardError({
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <h2 className="text-lg font-semibold">Dashboard error</h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Something went wrong loading this dashboard view.
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
