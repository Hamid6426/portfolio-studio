import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    title: "Configure environment variables",
    description:
      "Create a .env file at the project root with DATABASE_URL, AUTH_SECRET, and NODE_ENV. See .env.example for the full list.",
  },
  {
    title: "Run database migrations",
    description:
      "Generate and apply the Drizzle schema with drizzle-kit, then run your app. The startup check verifies the migration table exists.",
  },
  {
    title: "Create your admin account",
    description:
      "Open the setup page and register the first admin account. This unlocks the dashboard and portfolio management.",
  },
  {
    title: "Build your portfolio",
    description:
      "Log in to the dashboard, fill in your profile, projects, and skills, then publish your portfolio to your public URL.",
  },
];

export default function SetupGuidePage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <Badge className="mx-auto" variant="secondary">
            Setup Guide
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Get started with Portfolio Studio
          </h1>
          <p className="text-muted-foreground">
            Four steps from a blank database to a published portfolio.
          </p>
        </div>

        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                      {index + 1}
                    </span>
                    {step.title}
                  </CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>

        <Card>
          <CardHeader>
            <CardTitle>Ready when you are</CardTitle>
            <CardDescription>
              Once your database is migrated, create the admin account to get
              started.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button render={<Link href="/setup" />}>
              Create admin account
            </Button>
            <Button render={<Link href="/home" />} variant="outline">
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
