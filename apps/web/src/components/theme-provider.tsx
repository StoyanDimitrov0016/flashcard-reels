"use client";

import type { ReactNode } from "react";

import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = Readonly<{ children: ReactNode }>;

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}
