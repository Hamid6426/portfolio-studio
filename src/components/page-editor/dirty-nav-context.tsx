"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LeaveAction = {
  proceed: () => void;
  title?: string;
  description?: string;
  confirm?: string;
  destructive?: boolean;
};

type DirtyNavContextValue = {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  /** Runs immediately when clean; otherwise opens the shared leave dialog. */
  requestNavigation: (action: LeaveAction | (() => void)) => void;
};

const DEFAULT_LEAVE: Required<
  Pick<LeaveAction, "title" | "description" | "confirm" | "destructive">
> = {
  title: "Discard unsaved changes?",
  description: "You have unsaved changes. Leave without saving?",
  confirm: "Leave without saving",
  destructive: true,
};

const DirtyNavContext = createContext<DirtyNavContextValue | null>(null);

export function DirtyNavProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<LeaveAction | null>(null);

  const requestNavigation = useCallback(
    (action: LeaveAction | (() => void)) => {
      const config = typeof action === "function" ? { proceed: action } : action;
      if (!dirty) {
        config.proceed();
        return;
      }
      setPendingLeave(config);
      setLeaveOpen(true);
    },
    [dirty],
  );

  function closeLeave() {
    setLeaveOpen(false);
  }

  function confirmLeave() {
    const proceed = pendingLeave?.proceed;
    setLeaveOpen(false);
    setPendingLeave(null);
    proceed?.();
  }

  const value = useMemo(
    () => ({ dirty, setDirty, requestNavigation }),
    [dirty, requestNavigation],
  );

  const copy = pendingLeave
    ? {
        title: pendingLeave.title ?? DEFAULT_LEAVE.title,
        description: pendingLeave.description ?? DEFAULT_LEAVE.description,
        confirm: pendingLeave.confirm ?? DEFAULT_LEAVE.confirm,
        destructive: pendingLeave.destructive ?? DEFAULT_LEAVE.destructive,
      }
    : DEFAULT_LEAVE;

  return (
    <DirtyNavContext.Provider value={value}>
      {children}
      <Dialog open={leaveOpen} onOpenChange={(open) => !open && closeLeave()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeLeave}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={copy.destructive ? "destructive" : "default"}
              onClick={confirmLeave}
            >
              {copy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DirtyNavContext.Provider>
  );
}

/** No-op when used outside the dashboard editor chrome. */
export function useDirtyNav(): DirtyNavContextValue {
  const ctx = useContext(DirtyNavContext);
  return (
    ctx ?? {
      dirty: false,
      setDirty: () => {},
      requestNavigation: (action) => {
        const proceed = typeof action === "function" ? action : action.proceed;
        proceed();
      },
    }
  );
}
