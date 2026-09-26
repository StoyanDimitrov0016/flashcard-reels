import type { DeckInstallResult, DeckPackageFile } from "../index";
import type { DeckPackageDocument } from "./deck-package.schema.ts";

export type DeckPackage = Readonly<
  DeckPackageDocument & {
    audioFiles: ReadonlyMap<string, Uint8Array>;
    /** Lesson Markdown keyed by lesson ID. */
    lessonFiles: ReadonlyMap<string, string>;
  }
>;

export interface DeckPackageReader {
  read(bytes: Uint8Array): DeckPackage;
}

export interface DeckPackageFileReader {
  read(file: DeckPackageFile): Promise<Uint8Array>;
}

export interface DeckPackageInstallationTransaction {
  install(deckPackage: DeckPackage, now: string): Promise<DeckInstallResult>;
}

export interface InstalledDeckVersionRepository {
  findVersion(deckId: string): Promise<number | null>;
}

export type StagedDeckAudio = Readonly<{ deckId: string; token: string; version: number }>;

export interface DeckAudioStorage {
  stage(deckPackage: DeckPackage): Promise<StagedDeckAudio>;
  activate(staged: StagedDeckAudio): Promise<void>;
  removeVersion(deckId: string, version: number): Promise<void>;
  removeOtherVersions(deckId: string, keepVersion: number): Promise<void>;
}
