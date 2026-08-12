import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { DirtyNavProvider } from "@/components/page-editor/dirty-nav-context";
import { canAccessRoute } from "@/config/permissions";
import { REFRESH_TOKEN_COOKIE } from "@/config/storage-keys";
import { getAccessSession } from "@/lib/auth/session";
import { getRolePermissions } from "@/repositories/roles";

import {
  DashboardNav,
  type DashboardNavItem,
} from "./dashboard-nav";
import { DashboardSignOut } from "./dashboard-sign-out";

const navItems: DashboardNavItem[] = [
  {
    href: "/dashboard/overview",
    label: "Overview",
    icon: "overview",
  },
  {
    href: "/dashboard/pages",
    label: "Pages",
    icon: "pages",
  },
  {
    href: "/dashboard/blocks",
    label: "Blocks",
    icon: "blocks",
  },
  {
    href: "/dashboard/users",
    label: "Users",
    icon: "users",
  },
  {
    href: "/dashboard/roles",
    label: "Roles",
    icon: "roles",
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/dashboard/overview";
  const session = await getAccessSession();

  if (!session) {
    const jar = await cookies();
    const hasRefresh = Boolean(jar.get(REFRESH_TOKEN_COOKIE)?.value);

    if (hasRefresh) {
      redirect(
        `/api/auth/session/refresh?next=${encodeURIComponent(pathname)}`,
      );
    }

    // Clear sealed cookies via a Route Handler — `cookies().delete()` throws
    // in Server Components under Next.js 16.
    redirect(
      `/api/auth/session/clear?next=${encodeURIComponent(pathname)}`,
    );
  }

  const permissions = await getRolePermissions(session.role);
  const visibleNav = navItems.filter((item) =>
    canAccessRoute(permissions, item.href),
  );

  if (visibleNav.length === 0) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-lg font-semibold">No dashboard access</h1>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Your account ({session.email}) does not have permission to open any
          dashboard pages. Ask an admin to update your role.
        </p>
        <Link href="/login" className="text-sm underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (!canAccessRoute(permissions, pathname)) {
    const fallback = visibleNav[0]!.href;
    if (pathname === fallback) {
      redirect("/login");
    }
    redirect(fallback);
  }

  return (
    <DirtyNavProvider>
      <div className="grid min-h-screen flex-1 grid-cols-[14rem_1fr]">
        <aside className="flex flex-col border-r border-border bg-background">
          <div className="flex h-14 items-center border-b border-border px-5">
            <Link
              href={visibleNav[0]!.href}
              className="text-sm font-semibold tracking-tight"
            >
              Portfolio Studio
            </Link>
          </div>

          <DashboardNav items={visibleNav} />

          <div className="mt-auto space-y-3 border-t border-border px-3 py-4">
            <p className="truncate px-2 text-xs text-muted-foreground">
              {session.email}
            </p>
            <DashboardSignOut permissions={permissions} />
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          <header className="flex h-14 shrink-0 items-center border-b border-border px-6">
            <h1 className="text-sm font-medium text-muted-foreground">
              Dashboard
            </h1>
          </header>

          <main className="flex flex-1 flex-col overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </DirtyNavProvider>
  );
}
