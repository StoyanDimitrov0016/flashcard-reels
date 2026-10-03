import type { ResolvedColorScheme } from "@/shared/domain/color-scheme";

export type { ResolvedColorScheme } from "@/shared/domain/color-scheme";

export const colorModes = ["light", "dark", "device"] as const;
export type ColorMode = (typeof colorModes)[number];
export const studyIslandPositions = ["left", "bottom", "right"] as const;
export type StudyIslandPosition = (typeof studyIslandPositions)[number];
export const ratingDirections = ["forward", "reverse"] as const;
export type RatingDirection = (typeof ratingDirections)[number];
/** Which side of the study island a control sits on: before the ratings, or after them. */
export const controlSides = ["primary", "opposite"] as const;
export type ControlSide = (typeof controlSides)[number];
export type AudioSide = ControlSide;

export type AppPreferences = Readonly<{
  colorMode: ColorMode;
  studyIslandPosition: StudyIslandPosition;
  ratingDirection: RatingDirection;
  audioSide: AudioSide;
  audioEnabled: boolean;
  hapticsEnabled: boolean;
  readingEnabled: boolean;
  readingSide: ControlSide;
}>;

export const defaultAppPreferences: AppPreferences = {
  colorMode: "device",
  studyIslandPosition: "right",
  ratingDirection: "forward",
  audioSide: "primary",
  audioEnabled: true,
  hapticsEnabled: true,
  readingEnabled: true,
  // Opposite the audio button, so the two never crowd one side by default.
  readingSide: "opposite",
};

export function resolveColorScheme(
  colorMode: ColorMode,
  deviceScheme: ResolvedColorScheme | null | undefined
): ResolvedColorScheme {
  if (colorMode === "light" || colorMode === "dark") {
    return colorMode;
  }
  return deviceScheme === "light" ? "light" : "dark";
}
