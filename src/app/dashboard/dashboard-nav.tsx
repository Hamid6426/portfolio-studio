"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  FileTextIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const ICONS = {
  overview: LayoutDashboardIcon,
  users: UsersIcon,
  roles: ShieldIcon,
  pages: FileTextIcon,
  layouts: LayoutTemplateIcon,
} as const;

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

export function DashboardNav({ items }: { items: DashboardNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon] as LucideIcon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Button
            key={item.href}
            render={<Link href={item.href} />}
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
