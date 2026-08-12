import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  toDate,
  toIsoString,
} from "@/utils/time.utils";
import { formatBytes } from "@/utils/bytes.utils";
import { formEmail, formString } from "@/utils/form.utils";

describe("time.utils", () => {
  it("toDate rejects invalid values", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate("not-a-date")).toBeNull();
    expect(toDate("2026-01-15T12:00:00.000Z")).toBeInstanceOf(Date);
  });

  it("toIsoString passes strings and serializes dates", () => {
    expect(toIsoString(undefined)).toBeUndefined();
    expect(toIsoString("2026-01-01T00:00:00.000Z")).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(toIsoString(new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("formatDate / formatDateTime return empty labels for missing values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(null)).toBe("Unknown time");
    expect(formatDate("2026-06-01T00:00:00.000Z")).not.toBe("—");
  });
});

describe("bytes.utils", () => {
  it("formats byte sizes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("form.utils", () => {
  it("reads trimmed form fields", () => {
    const form = new FormData();
    form.set("name", "  Ada  ");
    form.set("email", "  Ada@Example.COM ");
    expect(formString(form, "name")).toBe("Ada");
    expect(formEmail(form, "email")).toBe("ada@example.com");
    expect(formString(form, "missing")).toBe("");
  });
});
