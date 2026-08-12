"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import { useAssetsQuery, useUploadAssetMutation } from "@/queries/assets";
import { cn } from "@/lib/utils";

type MediaPickerProps = {
  /** Called with the public `/upload/…` URL when the user picks or uploads. */
  onSelect: (url: string, meta?: { altHint?: string }) => void;
  disabled?: boolean;
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/** Compact control used in the image block settings panel. */
export function MediaPickerButton({ onSelect, disabled }: MediaPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <ImageIcon data-icon="inline-start" />
        Library / upload
      </Button>
      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={(url, meta) => {
          onSelect(url, meta);
          setOpen(false);
        }}
      />
    </>
  );
}

type MediaLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, meta?: { altHint?: string }) => void;
};

export function MediaLibraryDialog({
  open,
  onOpenChange,
  onSelect,
}: MediaLibraryDialogProps) {
  const assetsQuery = useAssetsQuery(open);
  const uploadMutation = useUploadAssetMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const assets = assetsQuery.data?.success ? assetsQuery.data.data : [];

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
    onSelect(response.data.url, {
      altHint: response.data.originalName.replace(/\.[^.]+$/, ""),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>
            Files are stored in the project <code>upload/</code> folder and
            served at <code>/upload/…</code>. JPEG, PNG, GIF, WebP, AVIF up to{" "}
            {Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
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
            size="sm"
            disabled={uploadMutation.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {uploadMutation.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UploadIcon data-icon="inline-start" />
            )}
            Upload image
          </Button>
        </div>

        <div className="min-h-0 max-h-[50vh] overflow-y-auto rounded-md border border-border">
          {assetsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading…
            </div>
          ) : assets.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No uploads yet. Add an image to get started.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className={cn(
                      "group flex w-full flex-col overflow-hidden rounded-md border border-border bg-card text-left",
                      "hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    onClick={() =>
                      onSelect(asset.url, {
                        altHint: asset.originalName.replace(/\.[^.]+$/, ""),
                      })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt=""
                      className="aspect-video w-full object-cover bg-muted"
                      loading="lazy"
                    />
                    <span className="truncate px-2 py-1.5 text-[11px] text-muted-foreground">
                      {asset.originalName}
                      <span className="ml-1 opacity-70">
                        ({formatBytes(asset.sizeBytes)})
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
