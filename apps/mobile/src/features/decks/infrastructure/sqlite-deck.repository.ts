import { asc, eq, inArray } from "drizzle-orm";

import type {
  DeckRepository,
  InstalledDeckIdentity,
} from "@/features/decks/domain/deck.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { DeckCoverAssetSchema } from "@/features/decks/contracts/deck.schema";
import {
  Deck as DeckModel,
  type Deck,
  type DeckCoverAsset,
  type DeckId,
} from "@/features/decks/domain/deck.model";
import { parseDatabaseRow } from "@/infrastructure/sqlite/parse-database-row";
import { decks } from "@/infrastructure/sqlite/schema";

export class SQLiteDeckRepository<TRunResult = unknown> implements DeckRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findById(id: DeckId): Promise<Deck | null> {
    const rows = await this.database.select().from(decks).where(eq(decks.id, id)).limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async findByIds(ids: readonly DeckId[]): Promise<Deck[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.database
      .select()
      .from(decks)
      .where(inArray(decks.id, ids))
      .orderBy(asc(decks.title), asc(decks.id));
    return rows.map((row) => this.toModel(row));
  }

  async list(): Promise<Deck[]> {
    const rows = await this.database.select().from(decks).orderBy(asc(decks.title), asc(decks.id));
    return rows.map((row) => this.toModel(row));
  }

  async updateCoverAsset(deckId: DeckId, coverAsset: DeckCoverAsset): Promise<void> {
    await this.database.update(decks).set({ coverAsset }).where(eq(decks.id, deckId));
  }

  async findRevision(id: DeckId): Promise<number | null> {
    const rows = await this.database
      .select({ revision: decks.revision })
      .from(decks)
      .where(eq(decks.id, id))
      .limit(1);
    return rows[0]?.revision ?? null;
  }

  async findInstalledIdentity(id: DeckId): Promise<InstalledDeckIdentity | null> {
    const rows = await this.database
      .select({ authorId: decks.authorId, revision: decks.revision })
      .from(decks)
      .where(eq(decks.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  private toModel(row: typeof decks.$inferSelect): Deck {
    return new DeckModel({
      description: row.description,
      id: row.id,
      title: row.title,
      coverAsset: parseDatabaseRow(DeckCoverAssetSchema, row.coverAsset, "decks", row.id),
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
