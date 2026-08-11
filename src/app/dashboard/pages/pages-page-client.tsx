"use client";

import { useMemo } from "react";
import { Loader2Icon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagesQuery } from "@/queries/pages";

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PagesPageClient() {
  const pagesQuery = usePagesQuery();
  const pages = useMemo(
    () => (pagesQuery.data?.success ? pagesQuery.data.data : []),
    [pagesQuery.data],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
        <p className="text-sm text-muted-foreground">
          Manage the pages that make up your public site.
        </p>
      </div>

      {pagesQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading pages…
        </div>
      ) : pagesQuery.data && !pagesQuery.data.success ? (
        <p className="text-sm text-destructive">{pagesQuery.data.message}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No pages yet.
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {page.slug ? `/${page.slug}` : "/ (home)"}
                  </TableCell>
                  <TableCell>{page.layoutName ?? "—"}</TableCell>
                  <TableCell>{formatDate(page.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
