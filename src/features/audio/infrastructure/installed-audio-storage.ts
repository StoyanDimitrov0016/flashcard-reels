import { Directory, File, Paths } from "expo-file-system";
import type { AudioSource } from "expo-audio";

import type {
  DeckAudioStorage,
  DeckPackage,
  PreparedDeckAudio,
} from "@/features/decks/domain/deck-package.model";
import type { AnswerAudioRepository } from "@/features/audio/domain/answer-audio.repository";

const AUDIO_ROOT_NAME = "deck-audio";

export class InstalledAudioStorage implements DeckAudioStorage, AnswerAudioRepository {
  private readonly preparedDirectories = new Map<string, Directory>();

  async prepare(deckPackage: DeckPackage): Promise<PreparedDeckAudio> {
    const root = this.audioRoot();
    root.create({ idempotent: true, intermediates: true });
    const token = `${deckPackage.manifest.id}-${deckPackage.manifest.version}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const temporary = new Directory(root, `.tmp-${token}`);
    temporary.create({ intermediates: true });
    for (const card of deckPackage.cards) {
      this.writeAudio(temporary, card.id, "question", card.questionAudio, deckPackage.audioFiles);
      this.writeAudio(temporary, card.id, "answer", card.answerAudio, deckPackage.audioFiles);
    }
    this.preparedDirectories.set(token, temporary);
    return { deckId: deckPackage.manifest.id, token, version: deckPackage.manifest.version };
  }

  async promote(prepared: PreparedDeckAudio): Promise<void> {
    const temporary = this.takePrepared(prepared);
    const root = this.audioRoot();
    const finalDirectory = new Directory(root, prepared.deckId);
    if (finalDirectory.exists) {
      finalDirectory.delete();
    }
    temporary.rename(prepared.deckId);
  }

  async discard(prepared: PreparedDeckAudio): Promise<void> {
    const temporary = this.preparedDirectories.get(prepared.token);
    this.preparedDirectories.delete(prepared.token);
    if (temporary?.exists) {
      temporary.delete();
    }
  }

  findSourceByFlashcardId(flashcardId: string): AudioSource {
    const root = this.audioRoot();
    if (!root.exists) {
      return null;
    }
    for (const entry of root.list()) {
      if (!(entry instanceof Directory) || !entry.exists) {
        continue;
      }
      for (const audioFile of entry.list()) {
        if (audioFile instanceof File && audioFile.name.startsWith(`${flashcardId}-answer.`)) {
          return { uri: audioFile.uri };
        }
      }
    }
    return null;
  }

  private audioRoot(): Directory {
    return new Directory(Paths.document, AUDIO_ROOT_NAME);
  }

  private takePrepared(prepared: PreparedDeckAudio): Directory {
    const temporary = this.preparedDirectories.get(prepared.token);
    if (!temporary) {
      throw new Error(`Prepared audio ${prepared.token} is no longer available`);
    }
    this.preparedDirectories.delete(prepared.token);
    return temporary;
  }

  private writeAudio(
    directory: Directory,
    flashcardId: string,
    side: "question" | "answer",
    reference: string | undefined,
    audioFiles: ReadonlyMap<string, Uint8Array>
  ): void {
    if (!reference) {
      return;
    }
    const bytes = audioFiles.get(reference);
    if (!bytes) {
      throw new Error(`Missing validated audio file ${reference}`);
    }
    const sourceName = reference.split("/").at(-1) ?? "audio.bin";
    const extension = sourceName.includes(".")
      ? sourceName.slice(sourceName.lastIndexOf("."))
      : ".bin";
    new File(directory, `${flashcardId}-${side}${extension}`).write(bytes);
  }
}
