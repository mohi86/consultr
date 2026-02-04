"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/app/stores/auth-store";
import { useThemeStore } from "@/app/stores/theme-store";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeTheme = useThemeStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
    initializeTheme();
  }, [initializeAuth, initializeTheme]);

  return <>{children}</>;
}
