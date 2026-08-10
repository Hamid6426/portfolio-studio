import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <span className="rounded-full border border-border bg-background px-4 py-1 text-xs font-medium text-muted-foreground">
          WordPress + Framer + Portfolio CMS
        </span>

        <div className="flex flex-col items-center gap-4">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Build your portfolio with ease
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            A complete portfolio management platform. Create an account, manage
            your content from a dashboard, switch themes, and publish instantly.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button render={<Link href="/dashboard" />} size="lg">
            Go to Dashboard
          </Button>
          <Button render={<Link href="/setup/guide" />} variant="outline" size="lg">
            View Setup Guide
          </Button>
        </div>
      </main>
    </div>
  );
}
