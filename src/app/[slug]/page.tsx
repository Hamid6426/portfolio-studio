import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/db/client";
import { portfolioTable, userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await db.query.userTable.findFirst({
    where: eq(userTable.name, slug),
    columns: { name: true },
  });

  if (!user) {
    return { title: "Not Found" };
  }

  return {
    title: `${user.name} — Portfolio`,
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await db.query.userTable.findFirst({
    where: eq(userTable.name, slug),
    columns: { id: true, name: true },
  });

  if (!user) {
    notFound();
  }

  const portfolio = await db.query.portfolioTable.findFirst({
    where: eq(portfolioTable.userId, user.id),
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Badge className="w-fit">Portfolio</Badge>
          <h1 className="text-4xl font-semibold tracking-tight">
            {user.name}
          </h1>
          {portfolio && (
            <p className="text-lg leading-8 text-muted-foreground">
              {portfolio.description}
            </p>
          )}
        </header>

        {portfolio ? (
          <Card>
            <CardHeader>
              <CardTitle>{portfolio.title}</CardTitle>
              <CardDescription>
                Published {formatDate(portfolio.publishedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">
                {portfolio.description}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Coming soon</CardTitle>
              <CardDescription>
                {user.name} has not published a portfolio yet.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Separator />

        <footer className="flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>Built with Portfolio Builder</p>
          <Button render={<a href="mailto:hello@example.com" />} variant="link" size="sm">
            Contact
          </Button>
        </footer>
      </main>
    </div>
  );
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}
