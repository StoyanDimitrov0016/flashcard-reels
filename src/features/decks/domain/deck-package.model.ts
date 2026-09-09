import type {
  DeckPackageCard,
  DeckPackageManifest,
} from "@/features/decks/contracts/deck-package.schema";

export type DeckPackage = Readonly<{
  manifest: DeckPackageManifest;
  cards: readonly DeckPackageCard[];
  audioFiles: ReadonlyMap<string, Uint8Array>;
}>;

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

export type PreparedDeckAudio = Readonly<{ deckId: string; token: string; version: number }>;

export interface DeckAudioStorage {
  prepare(deckPackage: DeckPackage): Promise<PreparedDeckAudio>;
  promote(prepared: PreparedDeckAudio): Promise<void>;
  discard(prepared: PreparedDeckAudio): Promise<void>;
}
