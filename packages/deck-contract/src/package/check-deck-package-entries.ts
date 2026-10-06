import type { DeckManifest } from "../deck.types.ts";
import type { DeckPackageParseIssue } from "../errors/deck-parse-issue.ts";

import { DeckPackageParseError } from "../errors/deck-package-parse-error.ts";
import { deckPackagePaths } from "./deck-package-paths.ts";

/** An archive holds exactly the files its manifest declares, and none of them is empty. */
export function deckPackageEntryIssues(
  manifest: DeckManifest,
  entrySizes: ReadonlyMap<string, number>
): DeckPackageParseIssue[] {
  const issues: DeckPackageParseIssue[] = [];
  const expected = deckPackagePaths(manifest);
  for (const path of expected) {
    const size = entrySizes.get(path);
    if (size === undefined) {
      issues.push({ path: [path], message: "Missing declared file" });
    } else if (size === 0) {
      issues.push({ path: [path], message: "Empty declared file" });
    }
  }
  for (const path of entrySizes.keys()) {
    if (!expected.has(path)) {
      issues.push({ path: [path], message: "Unreferenced archive file" });
    }
  }
  return issues;
}

export function checkDeckPackageEntries(
  manifest: DeckManifest,
  entrySizes: ReadonlyMap<string, number>
): void {
  const issues = deckPackageEntryIssues(manifest, entrySizes);
  if (issues.length > 0) {
    throw new DeckPackageParseError(issues);
  }
}
