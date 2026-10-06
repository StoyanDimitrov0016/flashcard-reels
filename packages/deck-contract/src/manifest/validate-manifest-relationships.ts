import type { DeckManifest } from "../deck.types.ts";
import type { DeckPackageParseIssue } from "../errors/deck-parse-issue.ts";

export function validateManifestRelationships(manifest: DeckManifest): DeckPackageParseIssue[] {
  const issues: DeckPackageParseIssue[] = [];
  const ids = new Set<string>();
  function addId(id: string, path: readonly (string | number)[]) {
    if (ids.has(id)) {
      issues.push({ path: ["deck.json", ...path], message: `Duplicate ID: ${id}` });
    }
    ids.add(id);
  }
  manifest.cards.forEach((card, index) => addId(card.id, ["cards", index, "id"]));
  manifest.lessons.forEach((lesson, index) => {
    addId(lesson.id, ["lessons", index, "id"]);
    lesson.sections.forEach((section, sectionIndex) =>
      addId(section.id, ["lessons", index, "sections", sectionIndex, "id"])
    );
    if (!lesson.intro && lesson.sections.length === 0) {
      issues.push({
        path: ["deck.json", "lessons", index],
        message: "A lesson requires an intro or at least one section",
      });
    }
  });
  const lessons = new Map(manifest.lessons.map((lesson) => [lesson.id, lesson]));
  manifest.cards.forEach((card, index) => {
    const lesson = card.lessonId === null ? undefined : lessons.get(card.lessonId);
    if (card.lessonId !== null && !lesson) {
      issues.push({
        path: ["deck.json", "cards", index, "lessonId"],
        message: `Card ${card.id} references a lesson outside this deck: ${card.lessonId}`,
      });
    }
    if (
      card.lessonSectionId !== null &&
      !lesson?.sections.some((section) => section.id === card.lessonSectionId)
    ) {
      issues.push({
        path: ["deck.json", "cards", index, "lessonSectionId"],
        message: `Card ${card.id} references a section outside its lesson: ${card.lessonSectionId}`,
      });
    }
  });
  return issues;
}
