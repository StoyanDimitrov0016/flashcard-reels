import Storage from "expo-sqlite/kv-store";

import {
  AppPreferencesSchema,
  normalizePersistedPreferences,
} from "@/features/preferences/application/normalize-preferences";
import {
  defaultAppPreferences,
  type AppPreferences,
} from "@/features/preferences/domain/app-preferences";
import type { PreferencesRepository } from "@/features/preferences/domain/preferences.repository";

export const PREFERENCES_STORAGE_KEY = "flashcard-reels.preferences.v1";

export class ExpoSqlitePreferencesRepository implements PreferencesRepository {
  async load(): Promise<AppPreferences> {
    try {
      const stored = await Storage.getItem(PREFERENCES_STORAGE_KEY);
      return normalizePersistedPreferences(stored ? JSON.parse(stored) : undefined);
    } catch {
      return defaultAppPreferences;
    }
  }

  async save(preferences: AppPreferences): Promise<void> {
    const normalized = AppPreferencesSchema.parse(preferences);
    await Storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  }
}

export const preferencesRepository = new ExpoSqlitePreferencesRepository();
