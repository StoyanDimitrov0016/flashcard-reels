import { strFromU8 } from "fflate";

import type { Deck } from "../deck.schemas.ts";

import { rejectDeckPackage } from "./reject-deck-package.ts";

export type DeckAssets = Readonly<{
  /** Audio bytes keyed by flashcard ID. */
  audioFiles: ReadonlyMap<string, Uint8Array>;
  /** Decoded Markdown keyed by lesson ID. */
  lessonFiles: ReadonlyMap<string, string>;
}>;

export function readDeckAssets(deck: Deck, files: Record<string, Uint8Array>): DeckAssets {
  const expected = new Set(["deck.json"]);
  const audioFiles = new Map<string, Uint8Array>();
  const lessonFiles = new Map<string, string>();

  for (const card of deck.cards) {
    if (!card.audio) {
      continue;
    }
    const path = `audio/${card.id}.mp3`;
    expected.add(path);
    const content = files[path];
    if (!content?.byteLength) {
      rejectDeckPackage(`Missing or empty audio file: ${path}`, [path]);
    }
    audioFiles.set(card.id, content);
  }

  for (const lesson of deck.lessons) {
    const path = `lessons/${lesson.id}.md`;
    expected.add(path);
    const content = files[path];
    if (!content?.byteLength) {
      rejectDeckPackage(`Missing or empty lesson file: ${path}`, [path]);
    }
    const markdown = strFromU8(content);
    if (!markdown.trim()) {
      rejectDeckPackage(`Empty lesson file: ${path}`, [path]);
    }
    lessonFiles.set(lesson.id, markdown);
  }

  for (const path of Object.keys(files)) {
    if (!expected.has(path)) {
      rejectDeckPackage(`Unreferenced archive file: ${path}`, [path]);
    }
  }

  return { audioFiles, lessonFiles };
}
