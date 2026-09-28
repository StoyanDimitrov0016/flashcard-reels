import { z } from "zod";

import {
  defaultAppPreferences,
  type AppPreferences,
} from "@/features/preferences/domain/app-preferences";

export const AppPreferencesSchema = z.object({
  colorMode: z.enum(["light", "dark", "device"]),
  studyIslandPosition: z.enum(["left", "bottom", "right"]),
  ratingDirection: z.enum(["forward", "reverse"]),
  audioSide: z.enum(["primary", "opposite"]),
  audioEnabled: z.boolean(),
  hapticsEnabled: z.boolean(),
  readingEnabled: z.boolean(),
  readingSide: z.enum(["primary", "opposite"]),
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
