import { describe, expect, it } from "vitest";

import {
  isSafeStoredName,
  publicUploadUrl,
  sniffImageMime,
} from "@/lib/media/storage";

describe("isSafeStoredName", () => {
  it("accepts uuid.ext names only", () => {
    expect(
      isSafeStoredName("550e8400-e29b-41d4-a716-446655440000.jpg"),
    ).toBe(true);
    expect(isSafeStoredName("../etc/passwd")).toBe(false);
    expect(isSafeStoredName("foo/bar.jpg")).toBe(false);
    expect(isSafeStoredName("not-a-uuid.png")).toBe(false);
  });
});

describe("publicUploadUrl", () => {
  it("prefixes the upload path", () => {
    expect(
      publicUploadUrl("550e8400-e29b-41d4-a716-446655440000.webp"),
    ).toBe("/upload/550e8400-e29b-41d4-a716-446655440000.webp");
  });
});

describe("sniffImageMime", () => {
  it("detects png and jpeg magic bytes", () => {
    const png = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    expect(sniffImageMime(png)).toBe("image/png");

    const jpeg = Uint8Array.from([
      0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(sniffImageMime(jpeg)).toBe("image/jpeg");

    expect(sniffImageMime(Uint8Array.from([0x3c, 0x73, 0x76, 0x67]))).toBe(
      null,
    );
  });
});
