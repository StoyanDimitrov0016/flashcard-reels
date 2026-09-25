import type { ResolvedColorScheme } from "@/shared/domain/color-scheme";

export type { ResolvedColorScheme } from "@/shared/domain/color-scheme";

export type AppearancePreference = "light" | "dark" | "device";
export type RecollectionIslandPosition = "left" | "bottom" | "right";
export type RatingDirection = "forward" | "reverse";
/** Which side of the study island a control sits on: before the ratings, or after them. */
export type ControlSide = "primary" | "opposite";
export type AudioSide = ControlSide;

export type AppPreferences = Readonly<{
  appearance: AppearancePreference;
  recollectionIslandPosition: RecollectionIslandPosition;
  ratingDirection: RatingDirection;
  audioSide: AudioSide;
  audioEnabled: boolean;
  hapticsEnabled: boolean;
  readingEnabled: boolean;
  readingSide: ControlSide;
}>;

export const defaultAppPreferences: AppPreferences = {
  appearance: "device",
  recollectionIslandPosition: "right",
  ratingDirection: "forward",
  audioSide: "primary",
  audioEnabled: true,
  hapticsEnabled: true,
  readingEnabled: true,
  // Opposite the audio button, so the two never crowd one side by default.
  readingSide: "opposite",
};

export function resolveColorScheme(
  appearance: AppearancePreference,
  deviceScheme: ResolvedColorScheme | null | undefined
): ResolvedColorScheme {
  if (appearance === "light" || appearance === "dark") {
    return appearance;
  }
  return deviceScheme === "light" ? "light" : "dark";
}
