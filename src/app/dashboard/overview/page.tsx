import Link from "next/link";
import { and, count, isNotNull, isNull } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db/client";
import { pagesTable, userTable } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [userCount, publishedPageCount] = await Promise.all([
    db.select({ value: count() }).from(userTable),
    db
      .select({ value: count() })
      .from(pagesTable)
      .where(
        and(isNotNull(pagesTable.publishedAt), isNull(pagesTable.deletedAt)),
      ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to your dashboard. Here is what is happening on your
          platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Registered accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{userCount[0]?.value ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Published pages</CardTitle>
            <CardDescription>Live on the public site</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {publishedPageCount[0]?.value ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            Build pages in the editor, then publish them to the public site.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button render={<Link href="/dashboard/pages" />} variant="outline">
            Manage pages
          </Button>
          <Button render={<Link href="/setup-guide" />} variant="outline">
            Read setup guide
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
