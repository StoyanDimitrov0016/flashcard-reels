import { DatabaseSync } from "node:sqlite";
import type { SQLiteBindValue, SQLiteRunResult } from "expo-sqlite";

import type { SQLiteDatabaseLike } from "@/infrastructure/sqlite/sqlite-database";

type NodeSqliteValue = null | number | bigint | string | NodeJS.ArrayBufferView;

export class NodeSqliteDatabase implements SQLiteDatabaseLike {
  private readonly database = new DatabaseSync(":memory:", {
    enableForeignKeyConstraints: true,
  });

  async execAsync(source: string): Promise<void> {
    this.database.exec(source);
  }

  async getAllAsync(source: string, ...params: SQLiteBindValue[]): Promise<unknown[]> {
    return this.database.prepare(source).all(...params.map(toNodeSqliteValue));
  }

  async getFirstAsync(source: string, ...params: SQLiteBindValue[]): Promise<unknown> {
    return this.database.prepare(source).get(...params.map(toNodeSqliteValue)) ?? null;
  }

  async runAsync(source: string, ...params: SQLiteBindValue[]): Promise<SQLiteRunResult> {
    const result = this.database.prepare(source).run(...params.map(toNodeSqliteValue));
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.database.exec("BEGIN");
    try {
      await task();
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }
}

function toNodeSqliteValue(value: SQLiteBindValue): NodeSqliteValue {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  return value;
}
