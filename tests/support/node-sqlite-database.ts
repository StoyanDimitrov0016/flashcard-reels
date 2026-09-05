import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import type { DatabaseSchema } from "@/infrastructure/sqlite/schema";

export type TestDatabase = BetterSQLite3Database<DatabaseSchema>;

type NodeSqliteValue = null | number | bigint | string | NodeJS.ArrayBufferView;

export class NodeSqliteDatabase {
  private readonly database: Database.Database;
  readonly drizzle: TestDatabase;

  constructor() {
    this.database = new Database(":memory:");
    this.database.pragma("foreign_keys = ON");
    this.database.exec(
      readFileSync(
        fileURLToPath(new URL("../../drizzle/0000_spooky_magneto.sql", import.meta.url)),
        "utf8"
      )
    );
    this.drizzle = drizzle<DatabaseSchema>(this.database);
  }

  async getAllAsync(source: string, ...params: NodeSqliteValue[]): Promise<unknown[]> {
    return this.database.prepare(source).all(...params);
  }

  async getFirstAsync(source: string, ...params: NodeSqliteValue[]): Promise<unknown> {
    return this.database.prepare(source).get(...params) ?? null;
  }

  async runAsync(
    source: string,
    ...params: NodeSqliteValue[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const result = this.database.prepare(source).run(...params);
    return {
      changes: result.changes,
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }

  close(): void {
    this.database.close();
  }
}
