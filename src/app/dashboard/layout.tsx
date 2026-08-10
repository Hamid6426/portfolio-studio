import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard/overview", label: "Overview" },
  { href: "/dashboard/login", label: "Login" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard/overview"
            className="text-sm font-semibold tracking-tight"
          >
            Portfolio Builder
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                render={<Link href={item.href} />}
                variant="ghost"
                size="sm"
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      </header>
      <Separator />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
