import { DefaultTheme, DarkTheme } from "expo-router";

import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { getAppColors, type AppColors } from "@/shared/presentation/theme-colors";
import type { ResolvedColorScheme } from "@/features/preferences/domain/app-preferences";

export type { AppColors } from "@/shared/presentation/theme-colors";

export function useAppTheme(): Readonly<{
  colors: AppColors;
  resolvedScheme: ResolvedColorScheme;
}> {
  const { resolvedScheme } = usePreferences();
  return { colors: getAppColors(resolvedScheme), resolvedScheme };
}

export function getRouterTheme(scheme: ResolvedColorScheme, colors: AppColors) {
  const base = scheme === "light" ? DefaultTheme : DarkTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      border: colors.border,
      card: colors.surface,
      notification: colors.accent,
      primary: colors.actionPrimary,
      text: colors.textPrimary,
    },
  };
}
