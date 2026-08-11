import {
  BUTTON_PERMISSIONS,
  ROUTE_PERMISSIONS,
  type Permission,
} from "@/config/permissions";

/** `create-admin` → `Create Admin` */
function humanizeKebab(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const ROUTE_PERMISSION_OPTIONS = Object.entries(ROUTE_PERMISSIONS).map(
  ([key, value]) => ({
    key,
    value: value as Permission,
    label: value.replace("route:", ""),
  }),
);

export const BUTTON_PERMISSION_OPTIONS = Object.entries(
  BUTTON_PERMISSIONS,
).map(([key, value]) => ({
  key,
  value: value as Permission,
  label: humanizeKebab(value.replace("button:", "")),
}));
