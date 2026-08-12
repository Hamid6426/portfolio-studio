"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LayoutTemplateIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  canShowButton,
  PERMISSIONS,
  type Permission,
} from "@/config/permissions";
import {
  useBlocksQuery,
  useCreateBlockMutation,
  useDeleteBlockMutation,
  useUpdateBlockMutation,
} from "@/queries/blocks";
import { blockEditorPath } from "@/lib/blocks/editor-path";
import type { BlockListItem } from "@/responses/blocks";

type BlocksPageClientProps = {
  permissions: Permission[] | string;
};

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

export function BlocksPageClient({ permissions }: BlocksPageClientProps) {
  const blocksQuery = useBlocksQuery();
  const createMutation = useCreateBlockMutation();
  const updateMutation = useUpdateBlockMutation();
  const deleteMutation = useDeleteBlockMutation();

  const canCreate = canShowButton(permissions, PERMISSIONS.blocksCreate);
  const canEdit = canShowButton(permissions, PERMISSIONS.blocksEdit);
  const canDelete = canShowButton(permissions, PERMISSIONS.blocksDelete);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BlockListItem | null>(null);
  const [deleting, setDeleting] = useState<BlockListItem | null>(null);
  const [canBeLayout, setCanBeLayout] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const blocks = useMemo(
    () => (blocksQuery.data?.success ? blocksQuery.data.data : []),
    [blocksQuery.data],
  );

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  function openCreate() {
    setEditing(null);
    setCanBeLayout(false);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(block: BlockListItem) {
    setEditing(block);
    setCanBeLayout(block.canBeLayout);
    setFieldErrors({});
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const payload = { name, description, canBeLayout };

    if (editing) {
      const result = await updateMutation.mutateAsync({
        id: editing.id,
        payload,
      });

      if (!result.success) {
        if (result.field) {
          setFieldErrors({ [result.field]: result.message });
        } else {
          toast.error(result.message);
        }
        return;
      }

      toast.success(result.message ?? "Block updated.");
      setFormOpen(false);
      return;
    }

    const result = await createMutation.mutateAsync(payload);

    if (!result.success) {
      if (result.field) {
        setFieldErrors({ [result.field]: result.message });
      } else {
        toast.error(result.message);
      }
      return;
    }

    toast.success(result.message ?? "Block created.");
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleting) return;

    const result = await deleteMutation.mutateAsync(deleting.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Block deleted.");
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Blocks</h1>
          <p className="text-sm text-muted-foreground">
            Reusable building pieces. Mark a block as a layout to attach it to
            pages.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} disabled={pending}>
            <PlusIcon data-icon="inline-start" />
            New block
          </Button>
        )}
      </div>

      {blocksQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading blocks…
        </div>
      ) : blocksQuery.data && !blocksQuery.data.success ? (
        <p className="text-sm text-destructive">{blocksQuery.data.message}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Children</TableHead>
              <TableHead>Created</TableHead>
              {(canEdit || canDelete) && (
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit || canDelete ? 5 : 4}
                  className="text-muted-foreground"
                >
                  No blocks yet.
                </TableCell>
              </TableRow>
            ) : (
              blocks.map((block) => (
                <TableRow key={block.id}>
                  <TableCell className="font-medium">{block.name}</TableCell>
                  <TableCell>{block.canBeLayout ? "Yes" : "No"}</TableCell>
                  <TableCell>{block.childCount}</TableCell>
                  <TableCell>{formatDate(block.createdAt)}</TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <Button
                            render={
                              <Link href={blockEditorPath(block.id)} />
                            }
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${block.name} content`}
                            title="Edit content"
                          >
                            <LayoutTemplateIcon />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(block)}
                            disabled={pending}
                            aria-label={`Edit ${block.name}`}
                          >
                            <PencilIcon />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleting(block)}
                            disabled={pending}
                            aria-label={`Delete ${block.name}`}
                          >
                            <TrashIcon />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit block" : "New block"}</DialogTitle>
            <DialogDescription>
              Blocks are HTML-like elements with children. Enable layout use to
              attach them to pages.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="block-name">Name</Label>
              <Input
                id="block-name"
                name="name"
                defaultValue={editing?.name ?? ""}
                required
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && (
                <p className="text-sm text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="block-description">Description</Label>
              <Input
                id="block-description"
                name="description"
                defaultValue={editing?.description ?? ""}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="block-can-be-layout" className="cursor-pointer">
                  Can Be Layout Block
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow attaching this block to pages as a layout.
                </p>
              </div>
              <button
                id="block-can-be-layout"
                type="button"
                role="switch"
                aria-checked={canBeLayout}
                onClick={() => setCanBeLayout((value) => !value)}
                className={
                  canBeLayout
                    ? "relative h-6 w-11 shrink-0 rounded-full bg-primary transition-colors"
                    : "relative h-6 w-11 shrink-0 rounded-full bg-input transition-colors"
                }
              >
                <span
                  className={
                    canBeLayout
                      ? "absolute top-0.5 left-5 size-5 rounded-full bg-primary-foreground transition-all"
                      : "absolute top-0.5 left-0.5 size-5 rounded-full bg-foreground/80 transition-all"
                  }
                />
              </button>
            </div>
            {fieldErrors.canBeLayout && (
              <p className="text-sm text-destructive">
                {fieldErrors.canBeLayout}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && (
                  <Loader2Icon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                )}
                {editing ? "Save changes" : "Create block"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete block</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{deleting?.name}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {deleteMutation.isPending && (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
