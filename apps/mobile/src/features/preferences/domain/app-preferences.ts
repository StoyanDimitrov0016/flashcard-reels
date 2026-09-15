export type AppearancePreference = "light" | "dark" | "device";
export type RecollectionIslandPosition = "left" | "bottom" | "right";
export type RatingDirection = "forward" | "reverse";
export type AudioSide = "primary" | "opposite";
export type ResolvedColorScheme = "light" | "dark";

export type AppPreferences = Readonly<{
  appearance: AppearancePreference;
  recollectionIslandPosition: RecollectionIslandPosition;
  ratingDirection: RatingDirection;
  audioSide: AudioSide;
  audioEnabled: boolean;
  hapticsEnabled: boolean;
}>;

export const defaultAppPreferences: AppPreferences = {
  appearance: "device",
  recollectionIslandPosition: "right",
  ratingDirection: "forward",
  audioSide: "primary",
  audioEnabled: true,
  hapticsEnabled: true,
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
