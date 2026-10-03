import { describe, expect, it } from "vitest";

import { searchReadingLists } from "@/features/lessons/presentation/reading-search";

function readingList(deckId: string, deckTitle: string, titles: string[]) {
  return {
    deckCoverAsset: "cards" as const,
    deckId,
    deckTitle,
    lessons: titles.map((title, order) => ({ id: `${deckId}-${order}`, order, title })),
  };
}

const systemDesign = readingList("sd", "System Design", ["Caching", "Sharding", "Queues"]);
const react = readingList("react", "React", ["Hooks", "Caching data"]);

describe("reading search", () => {
  it("keeps every deck and lesson for an empty search", () => {
    const results = searchReadingLists([systemDesign, react], "  ");

    expect(results.map((result) => result.lessons.length)).toEqual([3, 2]);
    expect(results.every((result) => !result.matchedLessonsOnly)).toBe(true);
  });

  it("keeps all lessons of a deck whose title matches", () => {
    const [result] = searchReadingLists([systemDesign, react], "design");

    expect(result?.readingList.deckId).toBe("sd");
    expect(result?.lessons).toHaveLength(3);
    expect(result?.matchedLessonsOnly).toBe(false);
  });

  it("previews only the matching lessons of other decks", () => {
    const results = searchReadingLists([systemDesign, react], "caching");

    expect(results.map((result) => result.lessons.map((lesson) => lesson.title))).toEqual([
      ["Caching"],
      ["Caching data"],
    ]);
    expect(results.every((result) => result.matchedLessonsOnly)).toBe(true);
  });

  it("leaves out decks with no match", () => {
    expect(searchReadingLists([systemDesign, react], "kubernetes")).toEqual([]);
  });
});
