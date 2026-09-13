import type { Clock } from "@/shared/domain/clock";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";
import {
  DeckPackageVersionError,
  type DeckInstallResult,
  type DeckInstaller,
  type DeckPackageFile,
} from "@/features/decks/deck-installer";
import type {
  DeckAudioStorage,
  DeckPackage,
  DeckPackageFileReader,
  DeckPackageInstallationTransaction,
  DeckPackageReader,
  InstalledDeckVersionRepository,
} from "@/features/decks/deck-installer/internal/deck-package.model";

/** Internal orchestration. Consumers use only the DeckInstaller interface exported by this module. */
export class DeckInstallerImpl implements DeckInstaller {
  private static readonly deckImportTails = new Map<string, Promise<void>>();
  private readonly reader: DeckPackageReader;
  private readonly installation: DeckPackageInstallationTransaction;
  private readonly audioStorage: DeckAudioStorage;
  private readonly clock: Clock;
  private readonly fileReader: DeckPackageFileReader;
  private readonly versionRepository: InstalledDeckVersionRepository;
  private readonly sessionSettlement: StudySessionSettlement | null;

  constructor(
    reader: DeckPackageReader,
    installation: DeckPackageInstallationTransaction,
    audioStorage: DeckAudioStorage,
    clock: Clock,
    fileReader: DeckPackageFileReader,
    versionRepository: InstalledDeckVersionRepository,
    sessionSettlement: StudySessionSettlement | null = null
  ) {
    this.reader = reader;
    this.installation = installation;
    this.audioStorage = audioStorage;
    this.clock = clock;
    this.fileReader = fileReader;
    this.versionRepository = versionRepository;
    this.sessionSettlement = sessionSettlement;
  }

  async installFromFile(file: DeckPackageFile): Promise<DeckInstallResult> {
    return this.installFromBytes(await this.fileReader.read(file));
  }

  async installFromBytes(bytes: Uint8Array): Promise<DeckInstallResult> {
    const deckPackage = this.reader.read(bytes);
    return this.withDeckGuard(deckPackage.id, () => this.install(deckPackage));
  }

  private async install(deckPackage: DeckPackage): Promise<DeckInstallResult> {
    const installedVersion = await this.versionRepository.findVersion(deckPackage.id);
    if (installedVersion === deckPackage.version) {
      return { deckId: deckPackage.id, status: "no-op", version: installedVersion };
    }
    if (installedVersion !== null && installedVersion > deckPackage.version) {
      throw new DeckPackageVersionError(
        `Deck ${deckPackage.id} version ${deckPackage.version} is older than installed version ${installedVersion}`
      );
    }

    await this.sessionSettlement?.settleActiveSessionsAffectedByDeck(
      deckPackage.id,
      installedVersion !== null
    );

    const stagedAudio = await this.audioStorage.stage(deckPackage);
    let audioActivated = false;
    try {
      // The guard and version check prove a same-version directory cannot be active database state.
      // The storage adapter may therefore replace it as residue from an earlier failed install.
      await this.audioStorage.activate(stagedAudio);
      audioActivated = true;
      const result = await this.installation.install(deckPackage, this.clock.now());
      if (result.status === "no-op") {
        await this.audioStorage.removeVersion(deckPackage.id, deckPackage.version);
      } else {
        try {
          await this.audioStorage.removeOtherVersions(deckPackage.id, deckPackage.version);
        } catch {
          // Obsolete files are safe to leave behind after a successful installation.
        }
      }
      return result;
    } catch (error) {
      if (audioActivated) {
        try {
          await this.audioStorage.removeVersion(deckPackage.id, deckPackage.version);
        } catch {
          // SQLite still identifies the previous version; residue is replaceable on retry.
        }
      }
      throw error;
    }
  }

  private async withDeckGuard<T>(deckId: string, operation: () => Promise<T>): Promise<T> {
    const previous = DeckInstallerImpl.deckImportTails.get(deckId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    DeckInstallerImpl.deckImportTails.set(deckId, current);
    await previous.catch(() => {});
    try {
      return await operation();
    } finally {
      release();
      if (DeckInstallerImpl.deckImportTails.get(deckId) === current) {
        DeckInstallerImpl.deckImportTails.delete(deckId);
      }
    }
  }
}
