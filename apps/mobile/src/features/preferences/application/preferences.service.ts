import type { AppPreferences } from "@/features/preferences/domain/app-preferences";
import type { PreferencesRepository } from "@/features/preferences/domain/preferences.repository";

export class PreferencesService {
  private readonly repository: PreferencesRepository;

  constructor(repository: PreferencesRepository) {
    this.repository = repository;
  }

  load(): Promise<AppPreferences> {
    return this.repository.load();
  }

  save(preferences: AppPreferences): Promise<void> {
    return this.repository.save(preferences);
  }
}
