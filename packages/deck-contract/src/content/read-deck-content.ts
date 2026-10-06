import type { Deck, DeckManifest } from "../deck.types.ts";
import type { DeckPackageParseIssue } from "../errors/deck-parse-issue.ts";

import { DECK_PACKAGE_LIMITS } from "../deck.constants.ts";
import { DeckPackageParseError } from "../errors/deck-package-parse-error.ts";
import { validateManifestRelationships } from "../manifest/validate-manifest-relationships.ts";
import { deckPackageEntryIssues } from "../package/check-deck-package-entries.ts";
import { lessonTextPath } from "../package/deck-package-paths.ts";
import { decodeUtf8 } from "./decode-utf8.ts";
import { validateLessonText } from "./validate-lesson-text.ts";

/**
 * Resolves every intro and section body. `entrySizes` lists every archive entry with its size;
 * `lessonFiles` holds the bytes of each non-empty lesson text entry. Audio bytes are not needed.
 */
export function readDeckContent(
  manifest: DeckManifest,
  entrySizes: ReadonlyMap<string, number>,
  lessonFiles: ReadonlyMap<string, Uint8Array>
): Deck {
  const issues = [
    ...validateManifestRelationships(manifest),
    ...deckPackageEntryIssues(manifest, entrySizes),
  ];
  function readBody(lessonId: string, sectionId: string | null): string {
    const path = lessonTextPath(lessonId, sectionId);
    if (!entrySizes.get(path)) {
      // Missing and empty entries are already reported by the entry check.
      return "";
    }
    const bytes = lessonFiles.get(path);
    if (bytes === undefined) {
      throw new Error(`Lesson text ${path} is listed in the archive but was not provided`);
    }
    const location: Omit<DeckPackageParseIssue, "message"> = { path: [path], lessonId, sectionId };
    const body = decodeUtf8(bytes);
    if (body === undefined) {
      issues.push({ ...location, message: "Lesson text must be valid UTF-8" });
      return "";
    }
    if (body.trim().length === 0) {
      issues.push({ ...location, message: "Lesson text is blank" });
      return "";
    }
    if (bytes.byteLength > DECK_PACKAGE_LIMITS.maxLessonTextFileBytes) {
      issues.push({ ...location, message: "Lesson text exceeds size limit" });
    }
    issues.push(...validateLessonText({ body, path, lessonId, sectionId }));
    return body;
  }
  const lessons = manifest.lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    intro: lesson.intro ? readBody(lesson.id, null) : null,
    sections: lesson.sections.map((section) => ({
      ...section,
      body: readBody(lesson.id, section.id),
    })),
  }));
  if (issues.length > 0) {
    throw new DeckPackageParseError(issues);
  }
  return { ...manifest, lessons };
}
