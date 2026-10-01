import type {
  BundledAppearance,
  DeckAudioStorage,
  DeckPackage,
  DeckPackageFileReader,
  DeckPackageInstallationTransaction,
  DeckPackageReader,
  InstalledDeckIdentityRepository,
} from "@/features/decks/deck-installer/internal/deck-package.model";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";
import type { Clock } from "@/shared/domain/clock";

import { withDeckOperation } from "@/features/decks/application/deck-operation-queue";
import {
  DeckPackageAuthorError,
  DeckPackageRevisionError,
  type DeckInstallResult,
  type DeckInstaller,
  type DeckPackageFile,
} from "@/features/decks/deck-installer";

/** Internal orchestration. Consumers use only the DeckInstaller interface exported by this module. */
export class DeckInstallerImpl implements DeckInstaller {
  private readonly reader: DeckPackageReader;
  private readonly installation: DeckPackageInstallationTransaction;
  private readonly audioStorage: DeckAudioStorage;
  private readonly clock: Clock;
  private readonly fileReader: DeckPackageFileReader;
  private readonly identityRepository: InstalledDeckIdentityRepository;
  private readonly sessionSettlement: StudySessionSettlement | null;

  constructor(
    reader: DeckPackageReader,
    installation: DeckPackageInstallationTransaction,
    audioStorage: DeckAudioStorage,
    clock: Clock,
    fileReader: DeckPackageFileReader,
    identityRepository: InstalledDeckIdentityRepository,
    sessionSettlement: StudySessionSettlement | null = null
  ) {
    this.reader = reader;
    this.installation = installation;
    this.audioStorage = audioStorage;
    this.clock = clock;
    this.fileReader = fileReader;
    this.identityRepository = identityRepository;
    this.sessionSettlement = sessionSettlement;
  }

  async installFromFile(file: DeckPackageFile): Promise<DeckInstallResult> {
    return this.installFromBytes(await this.fileReader.read(file));
  }

  async installFromBytes(
    bytes: Uint8Array,
    appearance?: BundledAppearance
  ): Promise<DeckInstallResult> {
    const deckPackage = this.reader.read(bytes);
    return withDeckOperation(deckPackage.deck.id, () => this.install(deckPackage, appearance));
  }

  private async install(
    deckPackage: DeckPackage,
    appearance?: BundledAppearance
  ): Promise<DeckInstallResult> {
    const deck = deckPackage.deck;
    const installed = await this.identityRepository.findInstalledIdentity(deck.id);
    if (installed && installed.authorId !== deck.authorId) {
      throw new DeckPackageAuthorError(`Deck ${deck.id} cannot change author ID across revisions`);
    }
    const installedRevision = installed?.revision ?? null;
    if (installedRevision === deck.revision) {
      return { deckId: deck.id, status: "no-op", revision: installedRevision };
    }
    if (installedRevision !== null && installedRevision > deck.revision) {
      throw new DeckPackageRevisionError(
        `Deck ${deck.id} revision ${deck.revision} is older than installed revision ${installedRevision}`
      );
    }

    await this.sessionSettlement?.settleActiveSessionsAffectedByDeck(
      deck.id,
      installedRevision !== null
    );

    const stagedAudio = await this.audioStorage.stage(deckPackage);
    let audioActivated = false;
    try {
      // The guard and revision check prove a same-revision directory cannot be active database state.
      // The storage adapter may therefore replace it as residue from an earlier failed install.
      await this.audioStorage.activate(stagedAudio);
      audioActivated = true;
      const result = await this.installation.install(deckPackage, this.clock.now(), appearance);
      if (result.status === "no-op") {
        await this.audioStorage.removeRevision(deck.id, deck.revision);
      } else {
        try {
          await this.audioStorage.removeOtherRevisions(deck.id, deck.revision);
        } catch {
          // Obsolete files are safe to leave behind after a successful installation.
        }
      }
      return result;
    } catch (error) {
      if (audioActivated) {
        try {
          await this.audioStorage.removeRevision(deck.id, deck.revision);
        } catch {
          // SQLite still identifies the previous revision; residue is replaceable on retry.
        }
      }
      throw error;
    }
  }
}
