import type { ReactNode } from "react";

import { usePreferencesContext } from "@/features/preferences/presentation/controllers/preferences-context";
import { AppThemeProvider } from "@/shared/presentation/theme";

type PreferencesThemeProviderProps = Readonly<{
  children: ReactNode;
}>;

export function PreferencesThemeProvider({ children }: PreferencesThemeProviderProps) {
  const { resolvedScheme } = usePreferencesContext();
  return <AppThemeProvider resolvedScheme={resolvedScheme}>{children}</AppThemeProvider>;
}
