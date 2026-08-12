import { describe, expect, it } from "vitest";

import {
  capitalizeWords,
  emptyToUndefined,
  humanizeKebab,
  isBlank,
  truncate,
} from "@/utils/string.utils";

describe("string.utils", () => {
  it("isBlank / emptyToUndefined", () => {
    expect(isBlank(null)).toBe(true);
    expect(isBlank("  ")).toBe(true);
    expect(isBlank("a")).toBe(false);
    expect(emptyToUndefined("  hi ")).toBe("hi");
    expect(emptyToUndefined("   ")).toBeUndefined();
  });

  it("humanizeKebab and capitalizeWords", () => {
    expect(humanizeKebab("create-admin")).toBe("Create Admin");
    expect(capitalizeWords("hello world")).toBe("Hello World");
  });

  it("truncate", () => {
    expect(truncate("abcdef", 10)).toBe("abcdef");
    expect(truncate("abcdef", 4)).toBe("abc…");
  });
});
