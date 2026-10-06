import type { DeckManifest } from "./deck.schemas.ts";

export type { DeckManifest, Flashcard } from "./deck.schemas.ts";
export type LessonSection = Readonly<{ id: string; title: string; body: string }>;
export type Lesson = Readonly<{
  id: string;
  title: string;
  intro: string | null;
  sections: readonly LessonSection[];
}>;
export type Deck = Readonly<Omit<DeckManifest, "lessons"> & { lessons: readonly Lesson[] }>;
export type DeckPackage = Readonly<{ deck: Deck; audio: ReadonlyMap<string, Uint8Array> }>;
