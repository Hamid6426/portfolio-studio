import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { DirtyNavProvider } from "@/components/page-editor/dirty-nav-context";
import { DirtyNavLink } from "@/components/page-editor/dirty-nav-link";
import { Toaster } from "@/components/ui/sonner";
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
    href: "/dashboard/themes",
    label: "Themes",
    icon: "themes",
  },
  {
    href: "/dashboard/media",
    label: "Media",
    icon: "media",
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
  const pathWithSearch =
    headerList.get("x-pathname") ?? "/dashboard/overview";
  const pathname = pathWithSearch.split(/[?#]/, 1)[0] || pathWithSearch;
  const session = await getAccessSession();

  if (!session) {
    const jar = await cookies();
    const hasRefresh = Boolean(jar.get(REFRESH_TOKEN_COOKIE)?.value);

    if (hasRefresh) {
      redirect(
        `/api/auth/session/refresh?next=${encodeURIComponent(pathWithSearch)}`,
      );
    }

    // Clear sealed cookies via a Route Handler — `cookies().delete()` throws
    // in Server Components under Next.js 16.
    redirect(
      `/api/auth/session/clear?next=${encodeURIComponent(pathWithSearch)}`,
    );
  }

  const permissions = await getRolePermissions(session.role);
  const visibleNav = navItems.filter((item) =>
    canAccessRoute(permissions, item.href),
  );

  if (visibleNav.length === 0) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-lg font-semibold">No dashboard access</h1>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Your account ({session.email}) does not have permission to open any
          dashboard pages. Ask an admin to update your role.
        </p>
        <div className="w-full max-w-xs">
          <DashboardSignOut permissions={permissions} />
        </div>
      </div>
    );
  }

  if (!canAccessRoute(permissions, pathname)) {
    redirect(visibleNav[0]!.href);
  }

  return (
    <DirtyNavProvider>
      <div className="grid min-h-screen flex-1 grid-cols-[14rem_1fr]">
        <aside className="flex flex-col border-r border-border bg-background">
          <div className="flex h-14 items-center border-b border-border px-5">
            <DirtyNavLink
              href={visibleNav[0]!.href}
              className="text-sm font-semibold tracking-tight"
            >
              Portfolio Studio
            </DirtyNavLink>
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
      <Toaster richColors closeButton position="top-center" />
    </DirtyNavProvider>
  );
}
