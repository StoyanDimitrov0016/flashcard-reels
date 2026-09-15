import { Directory, File, Paths } from "expo-file-system";

import type { AnswerAudioRepository } from "@/features/audio/domain/answer-audio.repository";
import type { DeckAudioRemover } from "@/features/decks/domain/deck.service";
import type { AudioReference, AudioSide } from "@/features/audio/domain/audio-reference";
import type {
  DeckAudioStorage,
  DeckPackage,
  StagedDeckAudio,
} from "@/features/decks/deck-installer/internal/deck-package.model";

const AUDIO_ROOT_NAME = "deck-audio";

export class InstalledAudioStorage
  implements DeckAudioStorage, AnswerAudioRepository, DeckAudioRemover
{
  private readonly stagedDirectories = new Map<string, Directory>();

  async stage(deckPackage: DeckPackage): Promise<StagedDeckAudio> {
    const root = this.audioRoot();
    root.create({ idempotent: true, intermediates: true });
    const token = `${deckPackage.id}-${deckPackage.version}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const temporary = new Directory(root, `.tmp-${token}`);
    temporary.create({ intermediates: true });
    try {
      for (const [path, bytes] of deckPackage.audioFiles) {
        const fileName = path.slice("audio/".length);
        new File(temporary, fileName).write(bytes);
      }
    } catch (error) {
      if (temporary.exists) {
        temporary.delete();
      }
      throw error;
    }
    this.stagedDirectories.set(token, temporary);
    return { deckId: deckPackage.id, token, version: deckPackage.version };
  }

  async activate(staged: StagedDeckAudio): Promise<void> {
    const temporary = this.takeStaged(staged);
    const deckDirectory = new Directory(this.audioRoot(), staged.deckId);
    deckDirectory.create({ idempotent: true, intermediates: true });
    const versionDirectory = new Directory(deckDirectory, String(staged.version));
    try {
      if (versionDirectory.exists) {
        versionDirectory.delete();
      }
      await temporary.move(versionDirectory);
    } catch (error) {
      if (temporary.exists) {
        temporary.delete();
      }
      throw error;
    }
  }

  async removeVersion(deckId: string, version: number): Promise<void> {
    const directory = new Directory(this.audioRoot(), deckId, String(version));
    if (directory.exists) {
      directory.delete();
    }
  }

  async removeDeck(deckId: string): Promise<void> {
    const directory = new Directory(this.audioRoot(), deckId);
    if (directory.exists) {
      directory.delete();
    }
  }

  async removeOtherVersions(deckId: string, keepVersion: number): Promise<void> {
    const deckDirectory = new Directory(this.audioRoot(), deckId);
    if (!deckDirectory.exists) {
      return;
    }
    for (const entry of deckDirectory.list()) {
      if (
        entry instanceof Directory &&
        entry.name !== String(keepVersion) &&
        !entry.name.startsWith(".tmp-")
      ) {
        entry.delete();
      }
    }
  }

  findSourceForFlashcard(
    deckId: string,
    version: number,
    flashcardId: string,
    side: AudioSide
  ): AudioReference {
    const file = new File(this.audioRoot(), deckId, String(version), `${flashcardId}.${side}.mp3`);
    return file.exists ? { uri: file.uri } : null;
  }

  private audioRoot(): Directory {
    return new Directory(Paths.document, AUDIO_ROOT_NAME);
  }

  private takeStaged(staged: StagedDeckAudio): Directory {
    const temporary = this.stagedDirectories.get(staged.token);
    if (!temporary) {
      throw new Error(`Staged audio ${staged.token} is no longer available`);
    }
    this.stagedDirectories.delete(staged.token);
    return temporary;
  }
}
