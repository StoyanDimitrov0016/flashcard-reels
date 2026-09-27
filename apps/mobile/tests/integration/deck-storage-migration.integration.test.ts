import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { describe, expect, it } from "vitest";

import { SYSTEM_AUTHOR_ID } from "@/features/decks/domain/system-author";

const oldMigrations = [
  "0000_cheerful_vengeance.sql",
  "0001_military_roulette.sql",
  "0002_lessons.sql",
  "0003_wonderful_dagger.sql",
];

function migrationSql(fileName: string): string {
  const moduleUrl = import.meta.url;
  const path = fileURLToPath(new URL(`../../drizzle/${fileName}`, moduleUrl));
  return readFileSync(path, "utf8");
}

describe("deck storage migration", () => {
  it("preserves installed and archived deck revisions", () => {
    const database = new Database(":memory:");
    try {
      for (const migration of oldMigrations) {
        database.exec(migrationSql(migration));
      }
      database
        .prepare(
          "INSERT INTO decks (id, title, description, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run("deck-id", "Deck", "", 3, "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
      database
        .prepare(
          "INSERT INTO deck_progress (deck_id, title, version, last_reviewed_at, resolution) VALUES (?, ?, ?, ?, ?)"
        )
        .run("deck-id", "Deck", 2, "2026-01-01T00:00:00Z", "archived");

      database.exec(migrationSql("0004_chief_chameleon.sql"));

      expect(
        database
          .prepare("SELECT author_id, package_schema, revision FROM decks WHERE id = ?")
          .get("deck-id")
      ).toEqual({ author_id: SYSTEM_AUTHOR_ID, package_schema: 1, revision: 3 });
      expect(
        database.prepare("SELECT revision FROM deck_progress WHERE deck_id = ?").get("deck-id")
      ).toEqual({ revision: 2 });
    } finally {
      database.close();
    }
  });
});
