"use client";

import { createContext, useContext, useEffect } from "react";

export const MyPageDraftContext = createContext<((dirty: boolean) => void) | null>(null);

export function useMyPageDraftGuard(dirty: boolean) {
  const setDirty = useContext(MyPageDraftContext);
  useEffect(() => {
    setDirty?.(dirty);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => {
      setDirty?.(false);
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty, setDirty]);
}
