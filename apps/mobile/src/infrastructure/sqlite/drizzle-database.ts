import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import type { DatabaseSchema } from "@/infrastructure/sqlite/schema";

export type DrizzleDatabase<TRunResult = unknown> = BaseSQLiteDatabase<
  "sync",
  TRunResult,
  DatabaseSchema
>;
