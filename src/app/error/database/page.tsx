import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TriangleAlertIcon } from "lucide-react";

export default async function DatabaseErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <TriangleAlertIcon className="size-6 text-destructive" />
          </span>
          <CardTitle className="text-2xl">
            We can&apos;t connect to your database
          </CardTitle>
          <CardDescription>
            Don&apos;t worry — your data is safe. This usually means the database
            isn&apos;t running, or the connection details are slightly off.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {message && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {message}
            </p>
          )}

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Here&apos;s how to fix it:</p>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5">
              <li>
                Make sure your database is running and accepting connections.
              </li>
              <li>
                Check that{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  DATABASE_URL
                </code>{" "}
                in your environment points to the right database.
              </li>
              <li>Restart the app and try again.</li>
            </ol>
          </div>
        </CardContent>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button render={<Link href="/" />}>Try again</Button>
          <Button
            render={<Link href="/setup-guide" />}
            variant="outline"
          >
            View setup guide
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
