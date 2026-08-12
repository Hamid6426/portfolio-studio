"use client";

import { useRef, useState } from "react";
import { Loader2Icon, TrashIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import {
  useAssetsQuery,
  useDeleteAssetMutation,
  useUploadAssetMutation,
} from "@/queries/assets";

type MediaPageClientProps = {
  permissions: Permission[] | string;
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaPageClient({ permissions }: MediaPageClientProps) {
  const assetsQuery = useAssetsQuery();
  const uploadMutation = useUploadAssetMutation();
  const deleteMutation = useDeleteAssetMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canUpload = canShowButton(permissions, PERMISSIONS.mediaUpload);
  const canDelete = canShowButton(permissions, PERMISSIONS.mediaDelete);
  const assets = assetsQuery.data?.success ? assetsQuery.data.data : [];
  const deleting = assets.find((item) => item.id === deletingId) ?? null;

  async function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(
        `Images must be ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB or smaller.`,
      );
      return;
    }
    const response = await uploadMutation.mutateAsync(file);
    if (!response.success) {
      toast.error(response.message);
      return;
    }
    toast.success("Uploaded");
  }

  async function confirmDelete() {
    if (!deleting) return;
    const response = await deleteMutation.mutateAsync(deleting.id);
    if (!response.success) {
      toast.error(response.message);
      return;
    }
    toast.success("Deleted");
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Local uploads in <code className="text-xs">upload/</code>, served at{" "}
            <code className="text-xs">/upload/…</code>. JPEG, PNG, GIF, WebP,
            AVIF · max {Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.
          </p>
        </div>
        {canUpload ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
              className="sr-only"
              onChange={(event) => {
                void onFileChange(event.target.files);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              disabled={uploadMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <UploadIcon data-icon="inline-start" />
              )}
              Upload
            </Button>
          </>
        ) : null}
      </div>

      {assetsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading…
        </div>
      ) : assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No media yet.</p>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Preview</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt=""
                      className="size-12 rounded object-cover ring-1 ring-border"
                    />
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate text-sm">
                    {asset.originalName}
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate font-mono text-xs text-muted-foreground">
                    {asset.url}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatBytes(asset.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-right">
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${asset.originalName}`}
                        onClick={() => setDeletingId(asset.id)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete media?</DialogTitle>
            <DialogDescription>
              Removes the file from disk and the media library. Pages that still
              reference {deleting?.url ?? "this URL"} will show a broken image
              until you update them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void confirmDelete()}
            >
              {deleteMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
