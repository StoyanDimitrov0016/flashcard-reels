import type { DeckPackage } from "@flashcard-reels/deck-contract";

import type { DeckThemeId } from "@/features/decks/domain/deck-theme-selection.model";
import type { DeckCoverAsset } from "@/features/decks/domain/deck.model";
import type { InstalledDeckIdentity } from "@/features/decks/domain/deck.repository";

import type { DeckInstallResult, DeckPackageFile } from "../index";

export type { DeckPackage };

export interface DeckPackageReader {
  read(bytes: Uint8Array): DeckPackage;
}

export interface DeckPackageFileReader {
  read(file: DeckPackageFile): Promise<Uint8Array>;
}

export type BundledAppearance = Readonly<{
  theme: DeckThemeId;
  coverAsset: DeckCoverAsset;
}>;

export interface DeckPackageInstallationTransaction {
  install(
    deckPackage: DeckPackage,
    now: string,
    appearance?: BundledAppearance
  ): Promise<DeckInstallResult>;
}

export interface InstalledDeckIdentityRepository {
  findInstalledIdentity(deckId: string): Promise<InstalledDeckIdentity | null>;
}

export type StagedDeckAudio = Readonly<{ deckId: string; token: string; revision: number }>;

export interface DeckAudioStorage {
  stage(deckPackage: DeckPackage): Promise<StagedDeckAudio>;
  activate(staged: StagedDeckAudio): Promise<void>;
  removeRevision(deckId: string, revision: number): Promise<void>;
  removeOtherRevisions(deckId: string, keepRevision: number): Promise<void>;
}
