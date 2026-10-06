import type { DeckManifest } from "../deck.types.ts";
import type { DeckPackageParseIssue } from "../errors/deck-parse-issue.ts";

import { decodeUtf8 } from "../content/decode-utf8.ts";
import { DECK_PACKAGE_LIMITS, DECK_SCHEMA_VERSION } from "../deck.constants.ts";
import { DeckManifestSchema } from "../deck.schemas.ts";
import { DeckPackageParseError } from "../errors/deck-package-parse-error.ts";
import { UnsupportedDeckSchemaError } from "../errors/unsupported-deck-schema-error.ts";
import { validateManifestRelationships } from "./validate-manifest-relationships.ts";

/** Decode the structural schema while allowing a package read to accumulate content issues. */
export function decodeDeckManifest(
  bytes: Uint8Array,
  issues: DeckPackageParseIssue[]
): DeckManifest | undefined {
  let input: unknown;
  try {
    const text = decodeUtf8(bytes);
    if (text === undefined) {
      issues.push({ path: ["deck.json"], message: "Manifest must contain valid UTF-8" });
      return undefined;
    }
    input = JSON.parse(text);
  } catch {
    issues.push({ path: ["deck.json"], message: "Manifest must contain valid UTF-8 JSON" });
    return undefined;
  }
  if (
    typeof input === "object" &&
    input !== null &&
    "schema" in input &&
    typeof input.schema === "number" &&
    input.schema !== DECK_SCHEMA_VERSION
  ) {
    throw new UnsupportedDeckSchemaError(input.schema);
  }
  const result = DeckManifestSchema.safeParse(input);
  if (!result.success) {
    issues.push(
      ...result.error.issues.map((issue) => ({
        path: [
          "deck.json",
          ...issue.path.map((part) => (typeof part === "symbol" ? String(part) : part)),
        ],
        message: issue.message,
      }))
    );
    return undefined;
  }
  return result.data;
}

export function parseDeckManifest(bytes: Uint8Array): DeckManifest {
  const issues: DeckPackageParseIssue[] = [];
  const manifest = decodeDeckManifest(bytes, issues);
  if (bytes.byteLength > DECK_PACKAGE_LIMITS.maxManifestFileBytes) {
    issues.push({ path: ["deck.json"], message: "Manifest file exceeds size limit" });
  }
  if (manifest) {
    issues.push(...validateManifestRelationships(manifest));
  }
  if (!manifest || issues.length > 0) {
    throw new DeckPackageParseError(issues);
  }
  return manifest;
}
