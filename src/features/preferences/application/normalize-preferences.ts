import { z } from "zod";

import {
  defaultAppPreferences,
  type AppPreferences,
} from "@/features/preferences/domain/app-preferences";

export const AppPreferencesSchema = z.object({
  appearance: z.enum(["light", "dark", "device"]),
  recollectionIslandPosition: z.enum(["left", "bottom", "right"]),
  ratingDirection: z.enum(["forward", "reverse"]),
  audioSide: z.enum(["primary", "opposite"]),
  audioEnabled: z.boolean(),
  hapticsEnabled: z.boolean(),
});

const PartialAppPreferencesSchema = AppPreferencesSchema.partial();

export function normalizePersistedPreferences(value: unknown): AppPreferences {
  const parsed = PartialAppPreferencesSchema.safeParse(value);
  return parsed.success ? { ...defaultAppPreferences, ...parsed.data } : defaultAppPreferences;
}
