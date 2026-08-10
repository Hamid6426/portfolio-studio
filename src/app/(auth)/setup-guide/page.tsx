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
          <Badge className="mx-auto border-white/20 bg-white/10 text-white">
            Setup Guide
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Get started with Portfolio Studio
          </h1>
          <p className="text-white/70">
            Four steps from a blank database to a published portfolio.
          </p>
        </div>

        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className="border border-white/15 bg-black/80 text-white shadow-none ring-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-medium text-black">
                      {index + 1}
                    </span>
                    {step.title}
                  </CardTitle>
                  <CardDescription className="text-white/65">
                    {step.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>

        <Card className="border border-white/15 bg-black/80 text-white shadow-none ring-0">
          <CardHeader>
            <CardTitle className="text-white">Ready when you are</CardTitle>
            <CardDescription className="text-white/65">
              Once your database is migrated, create the admin account to get
              started.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button
              render={<Link href="/setup" />}
              className="bg-white text-black hover:bg-white/90"
            >
              Create admin account
            </Button>
            <Button
              render={<Link href="/" />}
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
