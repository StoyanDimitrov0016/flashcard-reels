import { strToU8 } from "fflate";

import type { Deck, DeckManifest } from "../deck.types.ts";
import type { DeckPackageParseIssue } from "../errors/deck-parse-issue.ts";

import { DECK_PACKAGE_LIMITS } from "../deck.constants.ts";
import { DeckPackageParseError } from "../errors/deck-package-parse-error.ts";
import { validateManifestRelationships } from "../manifest/validate-manifest-relationships.ts";
import { lessonTextPath } from "../package/deck-package-paths.ts";
import { validateLessonText } from "./validate-lesson-text.ts";

export function readDeckContent(
  manifest: DeckManifest,
  readText: (path: string) => string | undefined
): Deck {
  const issues = validateManifestRelationships(manifest);
  function readBody(lessonId: string, sectionId: string | null): string {
    const path = lessonTextPath(lessonId, sectionId);
    const body = readText(path);
    const location: Omit<DeckPackageParseIssue, "message"> = { path: [path], lessonId, sectionId };
    if (body === undefined || body.trim().length === 0) {
      issues.push({ ...location, message: "Missing or empty lesson text" });
      return "";
    }
    if (strToU8(body).byteLength > DECK_PACKAGE_LIMITS.maxLessonTextFileBytes) {
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
