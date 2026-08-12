import { describe, expect, it } from "vitest";

import { isUploadThingEnabled, mediaBackendLabel } from "@/lib/media/backend";
import { isRemoteAssetUrl } from "@/lib/media/storage";

describe("media backend", () => {
  it("defaults to local without UPLOADTHING_TOKEN", () => {
    // vitest.setup does not set UPLOADTHING_TOKEN
    expect(isUploadThingEnabled()).toBe(false);
    expect(mediaBackendLabel()).toBe("local");
  });
});

describe("isRemoteAssetUrl", () => {
  it("detects http(s) CDN urls vs local /upload paths", () => {
    expect(isRemoteAssetUrl("https://utfs.io/f/abc")).toBe(true);
    expect(isRemoteAssetUrl("http://localhost/x")).toBe(true);
    expect(isRemoteAssetUrl("/upload/550e8400-e29b-41d4-a716-446655440000.webp")).toBe(
      false,
    );
  });
});
