import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "technical_flashcard_library");
const decks = JSON.parse(await readFile(path.join(sourceDirectory, "decks.json"), "utf8"));
const flashcards = JSON.parse(
  await readFile(path.join(sourceDirectory, "flashcards.json"), "utf8")
);

const deckColors = [
  ["#F8C15C", "#17130D"],
  ["#61DAFB", "#0B1720"],
  ["#FF9D66", "#1A100D"],
  ["#82E0B0", "#0D1815"],
  ["#B8A5FF", "#131020"],
  ["#D7A7FF", "#1A1020"],
];

if (
  !Array.isArray(decks) ||
  !Array.isArray(flashcards) ||
  decks.length === 0 ||
  flashcards.length === 0
) {
  throw new Error(
    "The technical flashcard library must contain non-empty decks and flashcards arrays."
  );
}

const deckIds = new Set(decks.map((deck) => deck.id));
const flashcardIds = new Set();
for (const flashcard of flashcards) {
  if (!deckIds.has(flashcard.deckId)) {
    throw new Error(`Flashcard ${flashcard.id} references an unknown deck ${flashcard.deckId}.`);
  }
  if (flashcardIds.has(flashcard.id)) {
    throw new Error(`Duplicate flashcard id: ${flashcard.id}`);
  }
  flashcardIds.add(flashcard.id);
}

const quote = (value) => JSON.stringify(value);
const renderObject = (value, indent = "  ") => {
  const entries = Object.entries(value).map(([key, entry]) => `${indent}${key}: ${quote(entry)}`);
  return `{\n${entries.join(",\n")}\n${indent.slice(0, -2)}}`;
};

const deckSource = decks.map((deck) => `  ${renderObject(deck)}`).join(",\n");
const appearanceSource = decks
  .map((deck, index) => {
    const [accentColor, backgroundColor] = deckColors[index % deckColors.length];
    return `  ${renderObject({ deckId: deck.id, accentColor, backgroundColor })}`;
  })
  .join(",\n");

const flashcardSource = flashcards.map((flashcard) => `  ${renderObject(flashcard)}`).join(",\n");

const decksModule = `import type { DeckAppearanceFields } from "@/features/decks/domain/deck-appearance.model";
import type { DeckFields } from "@/features/decks/domain/deck.model";

export const deckSeedData = [
${deckSource}
] satisfies readonly DeckFields[];

export const deckAppearanceSeedData = [
${appearanceSource}
] satisfies readonly DeckAppearanceFields[];
`;

const flashcardsModule = `import type { FlashcardFields } from "@/features/flashcards/domain/flashcard.model";

export const flashcardSeedData = [
${flashcardSource}
] satisfies readonly FlashcardFields[];
`;

await writeFile(
  path.join(root, "src", "features", "decks", "infrastructure", "seed-data", "decks.ts"),
  decksModule
);
await writeFile(
  path.join(root, "src", "features", "flashcards", "infrastructure", "seed-data", "flashcards.ts"),
  flashcardsModule
);

console.log(`Imported ${decks.length} decks and ${flashcards.length} flashcards.`);
