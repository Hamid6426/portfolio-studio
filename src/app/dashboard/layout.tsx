import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { REFRESH_TOKEN_COOKIE } from "@/config/storage-keys";
import { getAccessSession } from "@/lib/auth/session";

const navItems = [{ href: "/dashboard/overview", label: "Overview" }];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAccessSession();

  if (!session) {
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") ?? "/dashboard/overview";
    const jar = await cookies();
    const hasRefresh = Boolean(jar.get(REFRESH_TOKEN_COOKIE)?.value);

    if (hasRefresh) {
      redirect(
        `/api/auth/session/refresh?next=${encodeURIComponent(pathname)}`,
      );
    }

    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard/overview"
            className="text-sm font-semibold tracking-tight"
          >
            Portfolio Studio
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
            <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
              {session.email}
            </span>
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
