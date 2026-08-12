"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Re-throw Next.js control-flow errors (redirect/notFound).
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
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          The app hit an unexpected error. You can try again, or reload the
          page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
