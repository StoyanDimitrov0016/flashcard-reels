import type { SQLiteBindValue, SQLiteRunResult } from "expo-sqlite";

export interface SQLiteDatabaseLike {
  execAsync(source: string): Promise<void>;
  getAllAsync(source: string, ...params: SQLiteBindValue[]): Promise<unknown[]>;
  getFirstAsync(source: string, ...params: SQLiteBindValue[]): Promise<unknown>;
  runAsync(source: string, ...params: SQLiteBindValue[]): Promise<SQLiteRunResult>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
