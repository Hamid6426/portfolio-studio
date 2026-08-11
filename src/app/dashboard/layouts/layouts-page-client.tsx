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
import { useLayoutsQuery } from "@/queries/layouts";

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

export function LayoutsPageClient() {
  const layoutsQuery = useLayoutsQuery();
  const layouts = useMemo(
    () => (layoutsQuery.data?.success ? layoutsQuery.data.data : []),
    [layoutsQuery.data],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Layouts</h1>
        <p className="text-sm text-muted-foreground">
          Reusable page structures made of ordered blocks.
        </p>
      </div>

      {layoutsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading layouts…
        </div>
      ) : layoutsQuery.data && !layoutsQuery.data.success ? (
        <p className="text-sm text-destructive">{layoutsQuery.data.message}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Blocks</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {layouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No layouts yet.
                </TableCell>
              </TableRow>
            ) : (
              layouts.map((layout) => (
                <TableRow key={layout.id}>
                  <TableCell className="font-medium">{layout.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {layout.slug}
                  </TableCell>
                  <TableCell>{layout.blockCount}</TableCell>
                  <TableCell>{formatDate(layout.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
