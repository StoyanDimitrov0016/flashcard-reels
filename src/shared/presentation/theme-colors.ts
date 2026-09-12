import type { ResolvedColorScheme } from "@/features/preferences/domain/app-preferences";
import nativeIdentity from "@/shared/foundation/native-identity.json";

export type AppColors = Readonly<{
  canvas: string;
  navigation: string;
  surfaceRaised: string;
  surfaceSubtle: string;
  surfaceHover: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderSubtle: string;
  borderStrong: string;
  interactive: string;
  interactiveHover: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
  actionPrimary: string;
  actionPrimaryText: string;
  studyIslandSurface: string;
  studyIslandBorder: string;
  recallAgain: string;
  recallHard: string;
  recallGood: string;
  recallEasy: string;
}>;

export const lightColors: AppColors = {
  canvas: nativeIdentity.lightCanvas,
  navigation: nativeIdentity.lightNavigation,
  surfaceRaised: nativeIdentity.lightCanvas,
  surfaceSubtle: "#F1F1EF",
  surfaceHover: "#EFEFED",
  textPrimary: "#373530",
  textSecondary: "#787774",
  textTertiary: "#9B9A97",
  borderSubtle: "rgba(55,53,47,0.12)",
  borderStrong: "rgba(55,53,47,0.22)",
  interactive: "#2383E2",
  interactiveHover: "#0B6BCB",
  success: "#2E7D32",
  warning: "#C58A16",
  error: "#D44C47",
  overlay: "rgba(15,15,15,0.35)",
  actionPrimary: "#373530",
  actionPrimaryText: nativeIdentity.lightCanvas,
  studyIslandSurface: nativeIdentity.lightCanvas,
  studyIslandBorder: "rgba(55,53,47,0.22)",
  recallAgain: "#D44C47",
  recallHard: "#C58A16",
  recallGood: "#2E7D32",
  recallEasy: "#7852EE",
};

export const darkColors: AppColors = {
  canvas: nativeIdentity.darkCanvas,
  navigation: nativeIdentity.darkNavigation,
  surfaceRaised: "#252525",
  surfaceSubtle: "#2A2A2A",
  surfaceHover: "#2F2F2F",
  textPrimary: "#D4D4D4",
  textSecondary: "#9B9B9B",
  textTertiary: "#737373",
  borderSubtle: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  interactive: "#2383E2",
  interactiveHover: "#4A9EF0",
  success: "#4F9768",
  warning: "#C19138",
  error: "#BE524B",
  overlay: "rgba(0,0,0,0.55)",
  actionPrimary: "#D4D4D4",
  actionPrimaryText: nativeIdentity.darkCanvas,
  studyIslandSurface: "#252525",
  studyIslandBorder: "rgba(255,255,255,0.16)",
  recallAgain: "#BE524B",
  recallHard: "#C19138",
  recallGood: "#4F9768",
  recallEasy: "#A882FF",
};

export function getAppColors(scheme: ResolvedColorScheme): AppColors {
  return scheme === "light" ? lightColors : darkColors;
}
