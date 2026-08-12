import {
  BUTTON_PERMISSIONS,
  ROUTE_PERMISSIONS,
  type Permission,
} from "@/config/permissions";
import { humanizeKebab } from "@/utils/string.utils";

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
