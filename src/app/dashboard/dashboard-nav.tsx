"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BoxesIcon,
  FileTextIcon,
  ImageIcon,
  LayoutDashboardIcon,
  PaletteIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";

import { useDirtyNav } from "@/components/page-editor/dirty-nav-context";
import { Button } from "@/components/ui/button";

const ICONS = {
  overview: LayoutDashboardIcon,
  users: UsersIcon,
  roles: ShieldIcon,
  pages: FileTextIcon,
  blocks: BoxesIcon,
  themes: PaletteIcon,
  media: ImageIcon,
} as const;

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

export function DashboardNav({ items }: { items: DashboardNavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { requestNavigation } = useDirtyNav();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon] as LucideIcon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Button
            key={item.href}
            render={
              <Link
                href={item.href}
                // Browser back/forward is intentionally unguarded — onNavigate
                // only runs for in-app Link clicks, not history traversal.
                onNavigate={(event) => {
                  event.preventDefault();
                  requestNavigation(() => router.push(item.href));
                }}
              />
            }
            variant={active ? "secondary" : "ghost"}
            aria-current={active ? "page" : undefined}
            className="justify-start gap-2"
          >
            <Icon data-icon="inline-start" />
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
