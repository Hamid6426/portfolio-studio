import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Site-wide 404. Reached when a slug has no page, or the page exists but is
 * unpublished / soft-deleted — the public site deliberately cannot tell those
 * apart, so an unpublished draft never leaks its existence.
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          This page doesn&apos;t exist
        </h1>
        <p className="text-muted-foreground">
          The page you&apos;re looking for may have been moved, or it
          hasn&apos;t been published yet.
        </p>
        <Button render={<Link href="/" />} className="mt-2">
          Back to home
        </Button>
      </main>
    </div>
  );
}
