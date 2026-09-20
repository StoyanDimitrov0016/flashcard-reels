import { DefaultTheme, DarkTheme } from "expo-router";
import { createContext, createElement, type ReactNode, useContext } from "react";

import type { ResolvedColorScheme } from "@/shared/domain/color-scheme";
import { getAppColors, type AppColors } from "@/shared/presentation/theme-colors";

export type { AppColors } from "@/shared/presentation/theme-colors";

type AppThemeValue = Readonly<{
  colors: AppColors;
  resolvedScheme: ResolvedColorScheme;
}>;

const AppThemeContext = createContext<AppThemeValue | null>(null);

type AppThemeProviderProps = Readonly<{
  children: ReactNode;
  resolvedScheme: ResolvedColorScheme;
}>;

export function AppThemeProvider({ children, resolvedScheme }: AppThemeProviderProps) {
  const value: AppThemeValue = { colors: getAppColors(resolvedScheme), resolvedScheme };
  return createElement(AppThemeContext.Provider, { value }, children);
}

export function useAppTheme(): Readonly<{
  colors: AppColors;
  resolvedScheme: ResolvedColorScheme;
}> {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme requires AppThemeProvider");
  }
  return context;
}

export function getRouterTheme(scheme: ResolvedColorScheme, colors: AppColors) {
  const base = scheme === "light" ? DefaultTheme : DarkTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.canvas,
      border: colors.borderSubtle,
      card: colors.surfaceRaised,
      notification: colors.interactive,
      primary: colors.actionPrimary,
      text: colors.textPrimary,
    },
  };
}
