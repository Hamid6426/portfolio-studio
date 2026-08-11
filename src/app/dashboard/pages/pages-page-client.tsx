"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CloudOffIcon,
  CloudUploadIcon,
  EyeIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SquarePenIcon,
  TrashIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { useLayoutBlocksQuery } from "@/queries/blocks";
import {
  useCreatePageMutation,
  useDeletePageMutation,
  usePagesQuery,
  usePublishPageMutation,
  useUnpublishPageMutation,
  useUpdatePageMutation,
} from "@/queries/pages";
import type { PageSummary } from "@/responses/pages";
import { pageEditorPath } from "@/lib/pages/editor-path";
import { pagePreviewPath, pagePublicPath } from "@/lib/pages/preview-path";

type PagesPageClientProps = {
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

export function PagesPageClient({ permissions }: PagesPageClientProps) {
  const pagesQuery = usePagesQuery();
  const layoutBlocksQuery = useLayoutBlocksQuery();
  const createMutation = useCreatePageMutation();
  const updateMutation = useUpdatePageMutation();
  const deleteMutation = useDeletePageMutation();
  const publishMutation = usePublishPageMutation();
  const unpublishMutation = useUnpublishPageMutation();

  const canCreate = canShowButton(permissions, PERMISSIONS.pagesCreate);
  const canEdit = canShowButton(permissions, PERMISSIONS.pagesEdit);
  const canDelete = canShowButton(permissions, PERMISSIONS.pagesDelete);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PageSummary | null>(null);
  const [deleting, setDeleting] = useState<PageSummary | null>(null);
  const [publishing, setPublishing] = useState<PageSummary | null>(null);
  const [unpublishing, setUnpublishing] = useState<PageSummary | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pages = useMemo(
    () => (pagesQuery.data?.success ? pagesQuery.data.data : []),
    [pagesQuery.data],
  );
  const layoutBlocks = useMemo(
    () =>
      layoutBlocksQuery.data?.success ? layoutBlocksQuery.data.data : [],
    [layoutBlocksQuery.data],
  );

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    publishMutation.isPending ||
    unpublishMutation.isPending;

  function openCreate() {
    setEditing(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(page: PageSummary) {
    setEditing(page);
    setFieldErrors({});
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const blockId = String(formData.get("blockId") ?? "").trim();

    const payload = {
      title,
      slug,
      description,
      blockId: blockId || null,
      content: [],
    };

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

      toast.success(result.message ?? "Page updated.");
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

    toast.success(result.message ?? "Page created.");
    setFormOpen(false);
  }

  async function handlePublish() {
    if (!publishing) return;

    const result = await publishMutation.mutateAsync(publishing.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Page published.");
    setPublishing(null);
  }

  async function handleUnpublish() {
    if (!unpublishing) return;

    const result = await unpublishMutation.mutateAsync(unpublishing.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Page unpublished.");
    setUnpublishing(null);
  }

  async function handleDelete() {
    if (!deleting) return;

    const result = await deleteMutation.mutateAsync(deleting.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Page deleted.");
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
          <p className="text-sm text-muted-foreground">
            Manage the pages that make up your public site.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} disabled={pending}>
            <PlusIcon data-icon="inline-start" />
            New page
          </Button>
        )}
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
              <TableHead>Status</TableHead>
              <TableHead>Layout block</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[1%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No pages yet.
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page) => {
                const isPublished = Boolean(page.publishedAt);

                return (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {page.slug ? `/${page.slug}` : "/ (home)"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isPublished ? "default" : "secondary"}>
                      {isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>{page.blockName ?? "—"}</TableCell>
                  <TableCell>{formatDate(page.createdAt)}</TableCell>
                  <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            window.open(
                              isPublished
                                ? pagePublicPath(page.slug)
                                : pagePreviewPath(page.slug),
                              "_blank",
                            )
                          }
                          aria-label={
                            isPublished
                              ? `View ${page.title}`
                              : `Preview draft of ${page.title}`
                          }
                        >
                          <EyeIcon />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              isPublished
                                ? setUnpublishing(page)
                                : setPublishing(page)
                            }
                            disabled={pending}
                            aria-label={
                              isPublished
                                ? `Unpublish ${page.title}`
                                : `Publish ${page.title}`
                            }
                          >
                            {isPublished ? <CloudOffIcon /> : <CloudUploadIcon />}
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            render={
                              <Link href={pageEditorPath(page.slug)} />
                            }
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Open editor for ${page.title}`}
                          >
                            <SquarePenIcon />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(page)}
                            disabled={pending}
                            aria-label={`Edit ${page.title}`}
                          >
                            <PencilIcon />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleting(page)}
                            disabled={pending}
                            aria-label={`Delete ${page.title}`}
                          >
                            <TrashIcon />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit page" : "New page"}</DialogTitle>
            <DialogDescription>
              Leave slug empty to use this page as the site home at{" "}
              <span className="font-mono">/</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="page-title">Title</Label>
              <Input
                id="page-title"
                name="title"
                defaultValue={editing?.title ?? ""}
                required
                aria-invalid={Boolean(fieldErrors.title)}
              />
              {fieldErrors.title && (
                <p className="text-sm text-destructive">{fieldErrors.title}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="page-slug">Slug</Label>
              <Input
                id="page-slug"
                name="slug"
                placeholder="about (empty = home)"
                defaultValue={editing?.slug ?? ""}
                aria-invalid={Boolean(fieldErrors.slug)}
              />
              {fieldErrors.slug && (
                <p className="text-sm text-destructive">{fieldErrors.slug}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="page-description">Description</Label>
              <Input
                id="page-description"
                name="description"
                defaultValue={editing?.description ?? ""}
                aria-invalid={Boolean(fieldErrors.description)}
              />
              {fieldErrors.description && (
                <p className="text-sm text-destructive">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="page-block">Layout block</Label>
              <select
                id="page-block"
                name="blockId"
                defaultValue={editing?.blockId ?? ""}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-invalid={Boolean(fieldErrors.blockId)}
              >
                <option value="">No layout block</option>
                {layoutBlocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>
              {fieldErrors.blockId && (
                <p className="text-sm text-destructive">
                  {fieldErrors.blockId}
                </p>
              )}
            </div>

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
                {editing ? "Save changes" : "Create page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(publishing)}
        onOpenChange={(open) => !open && setPublishing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish page</DialogTitle>
            <DialogDescription>
              Publish &ldquo;{publishing?.title}&rdquo; to{" "}
              <span className="font-mono">
                {publishing ? pagePublicPath(publishing.slug) : ""}
              </span>
              ? This makes the current draft the live version of the page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPublishing(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handlePublish} disabled={pending}>
              {publishMutation.isPending && (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(unpublishing)}
        onOpenChange={(open) => !open && setUnpublishing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unpublish page</DialogTitle>
            <DialogDescription>
              Unpublish &ldquo;{unpublishing?.title}&rdquo;? Visitors will get a
              404. Your draft is kept and can be published again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnpublishing(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleUnpublish}
              disabled={pending}
            >
              {unpublishMutation.isPending && (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete page</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{deleting?.title}&rdquo;? This cannot be undone.
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
