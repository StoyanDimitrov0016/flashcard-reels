import { z } from "zod";

import {
  controlSides,
  ratingDirections,
  studyIslandPositions,
  colorModes,
  defaultAppPreferences,
  type AppPreferences,
} from "@/features/preferences/domain/app-preferences";

export const AppPreferencesSchema = z.object({
  colorMode: z.enum(colorModes),
  studyIslandPosition: z.enum(studyIslandPositions),
  ratingDirection: z.enum(ratingDirections),
  audioSide: z.enum(controlSides),
  audioEnabled: z.boolean(),
  hapticsEnabled: z.boolean(),
  readingEnabled: z.boolean(),
  readingSide: z.enum(controlSides),
});

const preferenceKeys: ReadonlyArray<keyof AppPreferences> = [
  "colorMode",
  "studyIslandPosition",
  "ratingDirection",
  "audioSide",
  "audioEnabled",
  "hapticsEnabled",
  "readingEnabled",
  "readingSide",
];

export function normalizePersistedPreferences(value: unknown): AppPreferences {
  if (!isRecord(value)) {
    return defaultAppPreferences;
  }

  const validValues: Partial<AppPreferences> = {};
  for (const key of preferenceKeys) {
    const parsed = AppPreferencesSchema.shape[key].safeParse(value[key]);
    if (parsed.success) {
      Object.assign(validValues, { [key]: parsed.data });
    }
  }

  return { ...defaultAppPreferences, ...validValues };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
