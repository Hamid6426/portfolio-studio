import { text } from "drizzle-orm/pg-core";

export const ROLES = ["admin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export const roleEnum = (name: string) => text(name, { enum: ROLES });
