import type { ResolvedColorScheme } from "@/features/preferences/domain/app-preferences";

export type AppColors = Readonly<{
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  controlOverlay: string;
  controlBorder: string;
  controlSelected: string;
  controlPressed: string;
  scrim: string;
  actionPrimary: string;
  actionPrimaryText: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
  recallEasy: string;
}>;

export const lightColors: AppColors = {
  background: "#FFFFFF",
  surface: "#FAFAFA",
  surfaceSubtle: "#FCFCFC",
  surfaceRaised: "#F6F6F6",
  border: "#E4E4E4",
  borderStrong: "#DADADA",
  textPrimary: "#222222",
  textSecondary: "#5C5C5C",
  textMuted: "#707070",
  textDisabled: "#ABABAB",
  controlOverlay: "rgba(255, 255, 255, 0.94)",
  controlBorder: "#DADADA",
  controlSelected: "#E4E4E4",
  controlPressed: "#DADADA",
  scrim: "rgba(0, 0, 0, 0.36)",
  actionPrimary: "#222222",
  actionPrimaryText: "#FFFFFF",
  accent: "#8A6500",
  danger: "#C83446",
  warning: "#8A6500",
  success: "#247A4E",
  recallEasy: "#7852EE",
};

export const darkColors: AppColors = {
  background: "#1C1C1C",
  surface: "#212121",
  surfaceSubtle: "#232323",
  surfaceRaised: "#282828",
  border: "#333333",
  borderStrong: "#3F3F3F",
  textPrimary: "#F2F2F2",
  textSecondary: "#B3B3B3",
  textMuted: "#999999",
  textDisabled: "#666666",
  controlOverlay: "rgba(28, 28, 28, 0.94)",
  controlBorder: "#3F3F3F",
  controlSelected: "#555555",
  controlPressed: "#666666",
  scrim: "rgba(0, 0, 0, 0.62)",
  actionPrimary: "#F2F2F2",
  actionPrimaryText: "#222222",
  accent: "#F2C14E",
  danger: "#FB5964",
  warning: "#E0AC00",
  success: "#44CF6E",
  recallEasy: "#A882FF",
};

export function getAppColors(scheme: ResolvedColorScheme): AppColors {
  return scheme === "light" ? lightColors : darkColors;
}
