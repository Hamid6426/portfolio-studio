import { z } from "zod";

import { isThemeId } from "@/lib/themes/registry";
import {
  isSafeColorValue,
  isSafeLengthValue,
  isSafeThemeCssValue,
} from "@/lib/themes/resolve";

function optionalOverride(
  check: (value: string) => boolean,
  message: string,
) {
  return z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine((value) => value === undefined || value === "" || check(value), {
      message,
    });
}

export const themeSettingsSchema = z
  .object({
    primaryColor: optionalOverride(
      isSafeColorValue,
      "Enter a valid colour (hex, rgb, or oklch).",
    ),
    radius: optionalOverride(
      isSafeLengthValue,
      "Enter a length such as 0.5rem or 8px.",
    ),
    sectionSpacing: optionalOverride(
      isSafeLengthValue,
      "Enter a length such as 56px or 3rem.",
    ),
    fontBody: optionalOverride(
      isSafeThemeCssValue,
      "That font stack is not allowed.",
    ),
  })
  .strict();

export const updateSiteThemePayloadSchema = z
  .object({
    themeId: z
      .string()
      .trim()
      .min(1)
      .refine((id) => isThemeId(id), { message: "Unknown theme." })
      .optional(),
    themeSettings: themeSettingsSchema.optional(),
  })
  .strict()
  .refine(
    (value) => value.themeId !== undefined || value.themeSettings !== undefined,
    { message: "Provide a themeId and/or themeSettings." },
  );

export type UpdateSiteThemePayload = z.infer<
  typeof updateSiteThemePayloadSchema
>;
