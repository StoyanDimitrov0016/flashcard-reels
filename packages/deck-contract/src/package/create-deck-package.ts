import { strToU8, zipSync, type Zippable } from "fflate";

import type { DeckPackage } from "../deck.types.ts";

import { audioPath, lessonTextPath } from "./deck-package-paths.ts";
import { parseDeckPackage } from "./parse-deck-package.ts";

export function createDeckPackage({ deck, audio }: DeckPackage): Uint8Array {
  const manifest = {
    ...deck,
    lessons: deck.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      intro: lesson.intro !== null,
      sections: lesson.sections.map(({ id, title }) => ({ id, title })),
    })),
  };
  const files: Record<string, Uint8Array> = { "deck.json": strToU8(JSON.stringify(manifest)) };
  for (const [id, bytes] of audio) {
    files[audioPath(id)] = bytes;
  }
  for (const lesson of deck.lessons) {
    if (lesson.intro !== null) {
      files[lessonTextPath(lesson.id, null)] = strToU8(lesson.intro);
    }
    for (const section of lesson.sections) {
      files[lessonTextPath(lesson.id, section.id)] = strToU8(section.body);
    }
  }
  const archive: Zippable = {};
  for (const [path, content] of Object.entries(files).toSorted(([left], [right]) =>
    left.localeCompare(right)
  )) {
    // ZIP records store local wall-clock fields, without a timezone.
    archive[path] = [content, { mtime: new Date(1980, 0, 1, 0, 0, 0) }];
  }
  const bytes = zipSync(archive, { level: 6 });
  parseDeckPackage(bytes);
  return bytes;
}
