import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import type { DatabaseSchema } from "@/infrastructure/sqlite/schema";

export type TestDatabase = BetterSQLite3Database<DatabaseSchema>;

type NodeSqliteValue = null | number | bigint | string | NodeJS.ArrayBufferView;

export class NodeSqliteDatabase {
  private readonly database: Database.Database;
  readonly drizzle: TestDatabase;

  constructor() {
    this.database = new Database(":memory:");
    this.database.pragma("foreign_keys = ON");
    // Keep filesystem resolution out of Vite's browser-asset new URL transform.
    const moduleUrl = import.meta.url;
    const migrationDirectory = fileURLToPath(new URL("../../drizzle", moduleUrl));
    for (const migrationFile of orderedMigrationFiles(readdirSync(migrationDirectory))) {
      this.database.exec(readFileSync(`${migrationDirectory}/${migrationFile}`, "utf8"));
    }
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

function orderedMigrationFiles(files: readonly string[]): string[] {
  const orderedFiles: string[] = [];
  for (const file of files) {
    if (!file.endsWith(".sql")) {
      continue;
    }
    const insertionIndex = orderedFiles.findIndex((current) => file.localeCompare(current) < 0);
    if (insertionIndex < 0) {
      orderedFiles.push(file);
    } else {
      orderedFiles.splice(insertionIndex, 0, file);
    }
  }
  return orderedFiles;
}
