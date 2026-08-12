"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { useDirtyNav } from "@/components/page-editor/dirty-nav-context";
import { Button } from "@/components/ui/button";
import {
  BUTTON_PERMISSIONS,
  canShowButton,
  type Permission,
} from "@/config/permissions";
import { useLogoutMutation } from "@/queries/auth";

export function DashboardSignOut({
  permissions,
}: {
  permissions: Permission[] | string;
}) {
  const router = useRouter();
  const { requestNavigation } = useDirtyNav();
  const logoutMutation = useLogoutMutation();

  if (!canShowButton(permissions, BUTTON_PERMISSIONS.signOut)) {
    return null;
  }

  async function handleSignOut() {
    const result = await logoutMutation.mutateAsync();
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Signed out.");
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2"
      disabled={logoutMutation.isPending}
      onClick={() =>
        requestNavigation({
          proceed: () => void handleSignOut(),
          title: "Discard unsaved changes?",
          description:
            "You have unsaved changes. Sign out without saving?",
          confirm: "Sign out without saving",
          destructive: true,
        })
      }
    >
      <LogOutIcon data-icon="inline-start" />
      Sign out
    </Button>
  );
}
