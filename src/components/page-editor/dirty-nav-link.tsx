"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

import { useDirtyNav } from "@/components/page-editor/dirty-nav-context";

type DirtyNavLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode;
};

export function DirtyNavLink({ href, children, ...rest }: DirtyNavLinkProps) {
  const router = useRouter();
  const { requestNavigation } = useDirtyNav();
  const destination = typeof href === "string" ? href : (href.pathname ?? "/");

  return (
    <Link
      href={href}
      {...rest}
      onNavigate={(event) => {
        event.preventDefault();
        requestNavigation(() => router.push(destination));
      }}
    >
      {children}
    </Link>
  );
}
