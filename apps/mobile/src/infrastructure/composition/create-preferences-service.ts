import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

import { PreferencesService } from "@/features/preferences/application/preferences.service";
import { SQLitePreferencesRepository } from "@/features/preferences/infrastructure/sqlite-preferences.repository";

type CreatePreferencesServiceOptions = Readonly<{
  database: DrizzleDatabase;
  clock: Clock;
  idGenerator: IdGenerator;
}>;

export function createPreferencesService({
  database,
  clock,
  idGenerator,
}: CreatePreferencesServiceOptions) {
  return new PreferencesService(new SQLitePreferencesRepository(database, clock, idGenerator));
}
