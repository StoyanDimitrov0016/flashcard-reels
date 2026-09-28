import { Directory, File, Paths } from "expo-file-system";

import type { FlashcardAudioRepository } from "@/features/audio/domain/flashcard-audio.repository";
import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type {
  DeckAudioStorage,
  DeckPackage,
  StagedDeckAudio,
} from "@/features/decks/deck-installer/internal/deck-package.model";
import type { DeckAudioRemover } from "@/features/decks/domain/deck.service";

const AUDIO_ROOT_NAME = "deck-audio";

export class InstalledAudioStorage
  implements DeckAudioStorage, FlashcardAudioRepository, DeckAudioRemover
{
  private readonly stagedDirectories = new Map<string, Directory>();

  async stage(deckPackage: DeckPackage): Promise<StagedDeckAudio> {
    const root = this.audioRoot();
    root.create({ idempotent: true, intermediates: true });
    const token = `${deckPackage.deck.id}-${deckPackage.deck.revision}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const temporary = new Directory(root, `.tmp-${token}`);
    temporary.create({ intermediates: true });
    try {
      for (const [cardId, bytes] of deckPackage.audioFiles) {
        new File(temporary, `${cardId}.mp3`).write(bytes);
      }
    } catch (error) {
      if (temporary.exists) {
        temporary.delete();
      }
      throw error;
    }
    this.stagedDirectories.set(token, temporary);
    return { deckId: deckPackage.deck.id, token, revision: deckPackage.deck.revision };
  }

  async activate(staged: StagedDeckAudio): Promise<void> {
    const temporary = this.takeStaged(staged);
    const deckDirectory = new Directory(this.audioRoot(), staged.deckId);
    deckDirectory.create({ idempotent: true, intermediates: true });
    const revisionDirectory = new Directory(deckDirectory, String(staged.revision));
    try {
      if (revisionDirectory.exists) {
        revisionDirectory.delete();
      }
      await temporary.move(revisionDirectory);
    } catch (error) {
      if (temporary.exists) {
        temporary.delete();
      }
      throw error;
    }
  }

  async removeRevision(deckId: string, revision: number): Promise<void> {
    const directory = new Directory(this.audioRoot(), deckId, String(revision));
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

  async removeOtherRevisions(deckId: string, keepRevision: number): Promise<void> {
    const deckDirectory = new Directory(this.audioRoot(), deckId);
    if (!deckDirectory.exists) {
      return;
    }
    for (const entry of deckDirectory.list()) {
      if (
        entry instanceof Directory &&
        entry.name !== String(keepRevision) &&
        !entry.name.startsWith(".tmp-")
      ) {
        entry.delete();
      }
    }
  }

  findSourceForFlashcard(deckId: string, revision: number, flashcardId: string): AudioReference {
    const file = new File(this.audioRoot(), deckId, String(revision), `${flashcardId}.mp3`);
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
