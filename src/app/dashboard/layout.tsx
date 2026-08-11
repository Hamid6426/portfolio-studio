import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { REFRESH_TOKEN_COOKIE } from "@/config/storage-keys";
import { getAccessSession } from "@/lib/auth/session";
import {
  ensureDefaultRoles,
  getRolePermissions,
} from "@/repositories/roles";

import {
  DashboardNav,
  type DashboardNavItem,
} from "./dashboard-nav";

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

    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  await ensureDefaultRoles();
  const permissions = await getRolePermissions(session.role);
  const visibleNav = navItems.filter((item) =>
    canAccessRoute(permissions, item.href),
  );

  return (
    <div className="grid min-h-screen flex-1 grid-cols-[14rem_1fr]">
      <aside className="flex flex-col border-r border-border bg-background">
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link
            href="/dashboard/overview"
            className="text-sm font-semibold tracking-tight"
          >
            Portfolio Studio
          </Link>
        </div>

        <DashboardNav items={visibleNav} />

        <div className="border-t border-border px-5 py-4">
          <p className="truncate text-xs text-muted-foreground">
            {session.email}
          </p>
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
  );
}
