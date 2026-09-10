import type { Clock } from "@/shared/domain/clock";
import type {
  DeckAudioStorage,
  DeckPackage,
  DeckPackageInstallationTransaction,
  DeckPackageInstallResult,
  DeckPackageFileReader,
  DeckPackageReader,
  InstalledDeckVersionRepository,
} from "@/features/decks/domain/deck-package.model";

export class DeckPackageImportService {
  private readonly deckImportTails = new Map<string, Promise<void>>();
  private readonly reader: DeckPackageReader;
  private readonly installation: DeckPackageInstallationTransaction;
  private readonly audioStorage: DeckAudioStorage;
  private readonly clock: Clock;
  private readonly fileReader: DeckPackageFileReader;
  private readonly versionRepository: InstalledDeckVersionRepository;

  constructor(
    reader: DeckPackageReader,
    installation: DeckPackageInstallationTransaction,
    audioStorage: DeckAudioStorage,
    clock: Clock,
    fileReader: DeckPackageFileReader,
    versionRepository: InstalledDeckVersionRepository
  ) {
    this.reader = reader;
    this.installation = installation;
    this.audioStorage = audioStorage;
    this.clock = clock;
    this.fileReader = fileReader;
    this.versionRepository = versionRepository;
  }

  async importFile(uri: string): Promise<DeckPackageInstallResult> {
    return this.import(await this.fileReader.read(uri));
  }

  async import(bytes: Uint8Array): Promise<DeckPackageInstallResult> {
    const deckPackage = this.reader.read(bytes);
    return this.withDeckImportGuard(deckPackage.id, () => this.install(deckPackage));
  }

  private async install(deckPackage: DeckPackage): Promise<DeckPackageInstallResult> {
    const installedVersion = await this.versionRepository.findVersion(deckPackage.id);
    if (installedVersion === deckPackage.version) {
      return { deckId: deckPackage.id, status: "no-op", version: installedVersion };
    }
    if (installedVersion !== null && installedVersion > deckPackage.version) {
      throw new Error(
        `Deck ${deckPackage.id} version ${deckPackage.version} is older than installed version ${installedVersion}`
      );
    }

    const stagedAudio = await this.audioStorage.stage(deckPackage);
    let audioActivated = false;
    try {
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
          // The database still points at the previous version when installation fails.
        }
      }
      throw error;
    }
  }

  private async withDeckImportGuard<T>(deckId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.deckImportTails.get(deckId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.deckImportTails.set(deckId, current);
    await previous.catch(() => {});
    try {
      return await operation();
    } finally {
      release();
      if (this.deckImportTails.get(deckId) === current) {
        this.deckImportTails.delete(deckId);
      }
    }
  }
}
