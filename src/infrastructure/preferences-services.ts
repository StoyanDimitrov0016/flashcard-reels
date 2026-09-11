import { PreferencesService } from "@/features/preferences/application/preferences.service";
import { preferencesRepository } from "@/features/preferences/infrastructure/expo-sqlite-preferences.repository";

export const preferencesService = new PreferencesService(preferencesRepository);
