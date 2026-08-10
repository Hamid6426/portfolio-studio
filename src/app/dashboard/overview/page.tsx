import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db/client";
import { portfolioTable, userTable } from "@/db/schema";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [userCount, portfolioCount] = await Promise.all([
    db.select({ value: count() }).from(userTable),
    db.select({ value: count() }).from(portfolioTable),
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
            <CardTitle>Portfolios</CardTitle>
            <CardDescription>Published portfolios</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {portfolioCount[0]?.value ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            The dashboard is still taking shape. Here is what you can do next.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button render={<Link href="/dashboard/login" />} variant="outline">
            Sign in
          </Button>
          <Button render={<Link href="/setup/guide" />} variant="outline">
            Read setup guide
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
