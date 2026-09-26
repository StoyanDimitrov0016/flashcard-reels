import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type {
  DeckAudioStorage,
  DeckPackage,
  StagedDeckAudio,
} from "@/features/decks/deck-installer/internal/deck-package.model";

import { ArchiveDeckPackageReader } from "@/features/decks/deck-installer/internal/archive-deck-package.reader";
import { DeckInstallerImpl } from "@/features/decks/deck-installer/internal/deck-installer";
import { SQLiteDeckPackageInstallationTransaction } from "@/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";

import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { TestClock } from "../support/study-fixtures";

const demoId = "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873";

class ResolvingAudioStorage implements DeckAudioStorage {
  private staged: DeckPackage | null = null;
  private readonly files = new Set<string>();

  async stage(deckPackage: DeckPackage): Promise<StagedDeckAudio> {
    this.staged = deckPackage;
    return { deckId: deckPackage.id, token: "demo", version: deckPackage.version };
  }

  async activate(staged: StagedDeckAudio): Promise<void> {
    if (!this.staged) {
      throw new Error("Missing staged demo");
    }
    for (const archivePath of this.staged.audioFiles.keys()) {
      this.files.add([staged.deckId, staged.version, archivePath.slice("audio/".length)].join("/"));
    }
  }

  async removeVersion(): Promise<void> {}
  async removeOtherVersions(): Promise<void> {}

  find(deckId: string, version: number, cardId: string): string | null {
    const installedPath = [deckId, version, cardId + ".answer.mp3"].join("/");
    return this.files.has(installedPath) ? installedPath : null;
  }
}

describe("built-in demo package", () => {
  let database: NodeSqliteDatabase | null = null;
  afterEach(() => database?.close());

  it("installs into a fresh database through the normal installer and resolves installed audio", async () => {
    database = new NodeSqliteDatabase();
    const bytes = new Uint8Array(
      await readFile(path.join(process.cwd(), "assets", "decks", demoId + ".fcrdeck"))
    );
    const reader = new ArchiveDeckPackageReader();
    const parsed = reader.read(bytes);
    const audio = new ResolvingAudioStorage();
    const installer = new DeckInstallerImpl(
      reader,
      new SQLiteDeckPackageInstallationTransaction(database.drizzle),
      audio,
      new TestClock(),
      { read: async () => bytes },
      new SQLiteDeckRepository(database.drizzle)
    );

    expect(parsed.cards).toHaveLength(6);
    expect(parsed.audioFiles.size).toBe(2);
    expect(parsed.lessonFiles.size).toBe(2);
    await expect(installer.installFromFile({ uri: "bundled-demo" })).resolves.toMatchObject({
      deckId: demoId,
      status: "installed",
      version: 2,
    });
    expect(await new SQLiteDeckRepository(database.drizzle).findVersion(demoId)).toBe(2);
    const audioCard = parsed.cards[0];
    if (!audioCard) {
      throw new Error("Demo package has no cards");
    }
    expect(audio.find(demoId, 2, audioCard.id)).not.toBeNull();
  });
});
