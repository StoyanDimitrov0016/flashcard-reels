import type { Clock } from "@/shared/domain/clock";
import type {
  DeckAudioStorage,
  DeckPackageInstallationTransaction,
  DeckPackageInstallResult,
  DeckPackageFileReader,
  DeckPackageReader,
} from "@/features/decks/domain/deck-package.model";

export class DeckPackageImportService {
  private readonly reader: DeckPackageReader;
  private readonly installation: DeckPackageInstallationTransaction;
  private readonly audioStorage: DeckAudioStorage;
  private readonly clock: Clock;
  private readonly fileReader: DeckPackageFileReader;

  constructor(
    reader: DeckPackageReader,
    installation: DeckPackageInstallationTransaction,
    audioStorage: DeckAudioStorage,
    clock: Clock,
    fileReader: DeckPackageFileReader
  ) {
    this.reader = reader;
    this.installation = installation;
    this.audioStorage = audioStorage;
    this.clock = clock;
    this.fileReader = fileReader;
  }

  async importFile(uri: string): Promise<DeckPackageInstallResult> {
    return this.import(await this.fileReader.read(uri));
  }

  async import(bytes: Uint8Array): Promise<DeckPackageInstallResult> {
    const deckPackage = this.reader.read(bytes);
    const preparedAudio = await this.audioStorage.prepare(deckPackage);
    try {
      const result = await this.installation.install(deckPackage, this.clock.now());
      if (result.status === "no-op") {
        await this.audioStorage.discard(preparedAudio);
      } else {
        await this.audioStorage.promote(preparedAudio);
      }
      return result;
    } catch (error) {
      await this.audioStorage.discard(preparedAudio);
      throw error;
    }
  }
}
