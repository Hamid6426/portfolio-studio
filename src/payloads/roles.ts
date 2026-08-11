import { z } from "zod";

import { PERMISSIONS, type Permission } from "@/config/permissions";

const permissionValues = Object.values(PERMISSIONS) as [Permission, ...Permission[]];

export const createRolePayloadSchema = z.object({
  roleName: z
    .string()
    .trim()
    .min(1, "Please enter a role name.")
    .max(64)
    .regex(
      /^[a-z][a-z0-9_-]*$/,
      "Use lowercase letters, numbers, hyphens, or underscores.",
    ),
  permissions: z.array(z.enum(permissionValues)).default([]),
});

export type CreateRolePayload = z.infer<typeof createRolePayloadSchema>;

export const updateRolePayloadSchema = z.object({
  permissions: z.array(z.enum(permissionValues)).min(0),
});

export type UpdateRolePayload = z.infer<typeof updateRolePayloadSchema>;
