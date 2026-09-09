import type { DeckPackageDocument } from "@/features/decks/contracts/deck-package.schema";

export type DeckPackage = Readonly<
  DeckPackageDocument & {
    audioFiles: ReadonlyMap<string, Uint8Array>;
  }
>;

export type DeckPackageInstallResult = Readonly<{
  status: "installed" | "updated" | "no-op";
  deckId: string;
  version: number;
}>;

export interface DeckPackageReader {
  read(bytes: Uint8Array): DeckPackage;
}

export interface DeckPackageFileReader {
  read(uri: string): Promise<Uint8Array>;
}

export interface DeckPackageInstallationTransaction {
  install(deckPackage: DeckPackage, now: string): Promise<DeckPackageInstallResult>;
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
