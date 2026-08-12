"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DirtyNavContextValue = {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
};

const DirtyNavContext = createContext<DirtyNavContextValue | null>(null);

export function DirtyNavProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const value = useMemo(() => ({ dirty, setDirty }), [dirty]);
  return (
    <DirtyNavContext.Provider value={value}>{children}</DirtyNavContext.Provider>
  );
}

/** No-op when used outside the dashboard editor chrome. */
export function useDirtyNav(): DirtyNavContextValue {
  const ctx = useContext(DirtyNavContext);
  return ctx ?? { dirty: false, setDirty: () => {} };
}
