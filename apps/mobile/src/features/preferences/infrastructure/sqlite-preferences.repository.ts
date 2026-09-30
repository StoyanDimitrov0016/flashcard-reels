import { eq } from "drizzle-orm";

import type { PreferencesRepository } from "@/features/preferences/domain/preferences.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

import { AppPreferencesSchema } from "@/features/preferences/application/normalize-preferences";
import {
  defaultAppPreferences,
  type AppPreferences,
} from "@/features/preferences/domain/app-preferences";
import { learnerPreferences } from "@/infrastructure/sqlite/schema";

export class SQLitePreferencesRepository<TRunResult = unknown> implements PreferencesRepository {
  private readonly database: DrizzleDatabase<TRunResult>;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(database: DrizzleDatabase<TRunResult>, clock: Clock, idGenerator: IdGenerator) {
    this.database = database;
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  async load(): Promise<AppPreferences> {
    const row = this.database.select().from(learnerPreferences).get();
    return row ? AppPreferencesSchema.parse(row) : defaultAppPreferences;
  }

  async save(preferences: AppPreferences): Promise<void> {
    const values = { ...AppPreferencesSchema.parse(preferences), updatedAt: this.clock.now() };
    this.database.transaction((transaction) => {
      const row = transaction.select({ id: learnerPreferences.id }).from(learnerPreferences).get();
      if (row) {
        transaction
          .update(learnerPreferences)
          .set(values)
          .where(eq(learnerPreferences.id, row.id))
          .run();
      } else {
        transaction
          .insert(learnerPreferences)
          .values({ id: this.idGenerator.generate(), ...values })
          .run();
      }
    });
  }
}
