"use client";

import { createContext, useContext } from "react";

export type ShellUser = { id: string; name: string; email: string; role: "admin" | "dentist"; subtitle: string };

type ShellContextValue = {
  user: ShellUser;
  openSearch: () => void;
  openDrawer: () => void;
};

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used inside <AppShell>");
  return value;
}
