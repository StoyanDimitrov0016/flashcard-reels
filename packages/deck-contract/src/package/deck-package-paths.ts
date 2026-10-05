import type { DeckManifest } from "../deck.types.ts";

export function audioPath(cardId: string): string {
  return `audio/${cardId}.mp3`;
}
export function lessonTextPath(lessonId: string, sectionId: string | null): string {
  return `lessons/${lessonId}/${sectionId === null ? "intro" : sectionId}.md`;
}

export function deckPackagePaths(manifest: DeckManifest): ReadonlySet<string> {
  const paths = new Set(["deck.json"]);
  for (const card of manifest.cards) {
    if (card.audio) {
      paths.add(audioPath(card.id));
    }
  }
  for (const lesson of manifest.lessons) {
    if (lesson.intro) {
      paths.add(lessonTextPath(lesson.id, null));
    }
    for (const section of lesson.sections) {
      paths.add(lessonTextPath(lesson.id, section.id));
    }
  }
  return paths;
}
