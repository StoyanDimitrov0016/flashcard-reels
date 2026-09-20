import type { ReactNode } from "react";

import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { AppThemeProvider } from "@/shared/presentation/theme";

type PreferencesThemeProviderProps = Readonly<{
  children: ReactNode;
}>;

export function PreferencesThemeProvider({ children }: PreferencesThemeProviderProps) {
  const { resolvedScheme } = usePreferences();
  return <AppThemeProvider resolvedScheme={resolvedScheme}>{children}</AppThemeProvider>;
}
