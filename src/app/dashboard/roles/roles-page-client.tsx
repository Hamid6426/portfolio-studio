"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  InfoIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  canShowButton,
  parsePermissions,
  PERMISSIONS,
  SYSTEM_ROLE_NAMES,
  type Permission,
} from "@/config/permissions";
import {
  BUTTON_PERMISSION_OPTIONS,
  ROUTE_PERMISSION_OPTIONS,
} from "@/lib/permission-options";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useRolesQuery,
  useUpdateRoleMutation,
} from "@/queries/roles";
import type { RoleSummary } from "@/responses/roles";

type RolesPageClientProps = {
  permissions: Permission[] | string;
};

function PermissionCheckboxGroup({
  title,
  hint,
  options,
  selected,
  onToggle,
  mono = false,
}: {
  title: string;
  hint?: string;
  options: { value: Permission; label: string }[];
  selected: Set<string>;
  onToggle: (value: Permission) => void;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        {hint && (
          <Tooltip>
            <TooltipTrigger
              type="button"
              className="inline-flex text-muted-foreground hover:text-foreground"
              aria-label={hint}
            >
              <InfoIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-border p-3">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selected.has(option.value)}
              onChange={() => onToggle(option.value)}
            />
            <span className={mono ? "font-mono text-xs" : "text-sm"}>
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function RolesPageClient({ permissions }: RolesPageClientProps) {
  const rolesQuery = useRolesQuery();
  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();

  const canCreate = canShowButton(permissions, PERMISSIONS.rolesCreate);
  const canEdit = canShowButton(permissions, PERMISSIONS.rolesEdit);
  const canDelete = canShowButton(permissions, PERMISSIONS.rolesDelete);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleSummary | null>(null);
  const [deleting, setDeleting] = useState<RoleSummary | null>(null);
  const [roleName, setRoleName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const roles = useMemo(
    () => (rolesQuery.data?.success ? rolesQuery.data.data : []),
    [rolesQuery.data],
  );

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  function openCreate() {
    setEditing(null);
    setRoleName("");
    setSelected(new Set());
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(role: RoleSummary) {
    setEditing(role);
    setRoleName(role.roleName);
    setSelected(new Set(parsePermissions(role.permissions)));
    setFieldErrors({});
    setFormOpen(true);
  }

  function togglePermission(value: Permission) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const permissionList = [...selected] as Permission[];

    if (editing) {
      const result = await updateMutation.mutateAsync({
        id: editing.id,
        payload: { permissions: permissionList },
      });

      if (!result.success) {
        if (result.field) {
          setFieldErrors({ [result.field]: result.message });
        } else {
          toast.error(result.message);
        }
        return;
      }

      toast.success(result.message ?? "Role updated.");
      setFormOpen(false);
      return;
    }

    const result = await createMutation.mutateAsync({
      roleName: roleName.trim(),
      permissions: permissionList,
    });

    if (!result.success) {
      if (result.field) {
        setFieldErrors({ [result.field]: result.message });
      } else {
        toast.error(result.message);
      }
      return;
    }

    toast.success(result.message ?? "Role created.");
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleting) return;

    const result = await deleteMutation.mutateAsync(deleting.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Role deleted.");
    setDeleting(null);
  }

  const isSystemRole =
    editing !== null &&
    (SYSTEM_ROLE_NAMES as string[]).includes(editing.roleName);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Control which routes and actions each role can use.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} disabled={pending}>
            <PlusIcon data-icon="inline-start" />
            New role
          </Button>
        )}
      </div>

      {rolesQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading roles…
        </div>
      ) : rolesQuery.data && !rolesQuery.data.success ? (
        <p className="text-sm text-destructive">{rolesQuery.data.message}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              {(canEdit || canDelete) && (
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit || canDelete ? 4 : 3}
                  className="text-muted-foreground"
                >
                  No roles yet.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => {
                const isSystem = (SYSTEM_ROLE_NAMES as string[]).includes(
                  role.roleName,
                );
                const canDeleteThis =
                  canDelete && !isSystem && role.userCount === 0;

                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium capitalize">
                      {role.roleName}
                      {isSystem && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          system
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{role.permissionCount}</TableCell>
                    <TableCell>{role.userCount}</TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(role)}
                              disabled={pending}
                              aria-label={`Edit ${role.roleName}`}
                            >
                              <PencilIcon />
                            </Button>
                          )}
                          {canDeleteThis && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleting(role)}
                              disabled={pending}
                              aria-label={`Delete ${role.roleName}`}
                            >
                              <TrashIcon />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit role" : "New role"}</DialogTitle>
            <DialogDescription>
              {editing
                ? isSystemRole
                  ? "System role names are fixed. You can still change permissions."
                  : "Update the permissions for this role."
                : "Create a role and choose its route and button permissions."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="role-name">Role name</Label>
              <Input
                id="role-name"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="e.g. publisher"
                disabled={Boolean(editing)}
                required={!editing}
                aria-invalid={Boolean(fieldErrors.roleName)}
              />
              {fieldErrors.roleName && (
                <p className="text-sm text-destructive">
                  {fieldErrors.roleName}
                </p>
              )}
            </div>

            <TooltipProvider>
              <PermissionCheckboxGroup
                title="Pages"
                hint="Controls which dashboard and app pages this role can open."
                options={ROUTE_PERMISSION_OPTIONS}
                selected={selected}
                onToggle={togglePermission}
                mono
              />
              <PermissionCheckboxGroup
                title="Buttons"
                hint="Controls which actions and controls this role can see and use."
                options={BUTTON_PERMISSION_OPTIONS}
                selected={selected}
                onToggle={togglePermission}
              />
            </TooltipProvider>
            {fieldErrors.permissions && (
              <p className="text-sm text-destructive">
                {fieldErrors.permissions}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && (
                  <Loader2Icon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                )}
                {editing ? "Save changes" : "Create role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete role</DialogTitle>
            <DialogDescription>
              Delete role &ldquo;{deleting?.roleName}&rdquo;? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {deleteMutation.isPending && (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
