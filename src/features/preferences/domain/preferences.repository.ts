import type { AppPreferences } from "@/features/preferences/domain/app-preferences";

export interface PreferencesRepository {
  load(): Promise<AppPreferences>;
  save(preferences: AppPreferences): Promise<void>;
}
