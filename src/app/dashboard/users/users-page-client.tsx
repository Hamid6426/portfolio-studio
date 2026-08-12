"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";

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
import { PasswordInput } from "@/components/ui/password-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  canShowButton,
  PERMISSIONS,
  type Permission,
} from "@/config/permissions";
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useUsersQuery,
} from "@/queries/users";
import { useRolesQuery } from "@/queries/roles";
import type { UserSummary } from "@/responses/users";
import { formEmail, formString } from "@/utils/form.utils";
import { formatDate } from "@/utils/time.utils";

type UsersPageClientProps = {
  permissions: Permission[] | string;
  currentUserId: string;
};

export function UsersPageClient({
  permissions,
  currentUserId,
}: UsersPageClientProps) {
  const usersQuery = useUsersQuery();
  const rolesQuery = useRolesQuery();
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();

  const canCreate = canShowButton(permissions, PERMISSIONS.usersCreate);
  const canEdit = canShowButton(permissions, PERMISSIONS.usersEdit);
  const canDelete = canShowButton(permissions, PERMISSIONS.usersDelete);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [deleting, setDeleting] = useState<UserSummary | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const users = useMemo(
    () => (usersQuery.data?.success ? usersQuery.data.data : []),
    [usersQuery.data],
  );
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
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(user: UserSummary) {
    setEditing(user);
    setFieldErrors({});
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const name = formString(formData, "name");
    const email = formEmail(formData, "email");
    const role = formString(formData, "role");
    const password = String(formData.get("password") ?? "");

    if (editing) {
      const result = await updateMutation.mutateAsync({
        id: editing.id,
        payload: { name, email, role, password },
      });

      if (!result.success) {
        if (result.field) {
          setFieldErrors({ [result.field]: result.message });
        } else {
          toast.error(result.message);
        }
        return;
      }

      toast.success(result.message ?? "User updated.");
      setFormOpen(false);
      return;
    }

    const result = await createMutation.mutateAsync({
      name,
      email,
      role,
      password,
    });

    if (!result.success) {
      if (result.field) {
        setFieldErrors({ [result.field]: result.message });
      } else {
        toast.error(result.message);
      }
      return;
    }

    toast.success(result.message ?? "User created.");
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleting) return;

    const result = await deleteMutation.mutateAsync(deleting.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "User deleted.");
    setDeleting(null);
  }

  const loading = usersQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage accounts for your studio.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} disabled={pending}>
            <PlusIcon data-icon="inline-start" />
            New user
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading users…
        </div>
      ) : usersQuery.data && !usersQuery.data.success ? (
        <p className="text-sm text-destructive">{usersQuery.data.message}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              {(canEdit || canDelete) && (
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit || canDelete ? 5 : 4}
                  className="text-muted-foreground"
                >
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(user)}
                            disabled={pending}
                            aria-label={`Edit ${user.name}`}
                          >
                            <PencilIcon />
                          </Button>
                        )}
                        {canDelete && user.id !== currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleting(user)}
                            disabled={pending}
                            aria-label={`Delete ${user.name}`}
                          >
                            <TrashIcon />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update name, email, or role. Leave password blank to keep it."
                : "Add a new account with a role and password."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                name="name"
                defaultValue={editing?.name ?? ""}
                required
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && (
                <p className="text-sm text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                name="email"
                type="email"
                defaultValue={editing?.email ?? ""}
                required
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-role">Role</Label>
              <select
                id="user-role"
                name="role"
                defaultValue={editing?.role ?? roles[0]?.roleName ?? "viewer"}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                required
                aria-invalid={Boolean(fieldErrors.role)}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.roleName}>
                    {role.roleName}
                  </option>
                ))}
              </select>
              {fieldErrors.role && (
                <p className="text-sm text-destructive">{fieldErrors.role}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-password">
                Password{editing ? " (optional)" : ""}
              </Label>
              <PasswordInput
                id="user-password"
                name="password"
                autoComplete={editing ? "new-password" : "new-password"}
                required={!editing}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password && (
                <p className="text-sm text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

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
                {editing ? "Save changes" : "Create user"}
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
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Delete {deleting?.name}? This cannot be undone.
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
