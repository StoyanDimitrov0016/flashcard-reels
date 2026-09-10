import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { ArchiveDeckPackageReader } from "../src/features/decks/deck-installer/internal/archive-deck-package.reader.ts";

const root = process.cwd();
const registry = JSON.parse(
  await readFile(path.join(root, "src", "infrastructure", "bundled-deck-registry.json"), "utf8")
);
if (!Array.isArray(registry) || registry.length === 0) {
  throw new Error("Bundled deck registry must contain at least one entry");
}

const packageDirectory = path.join(root, "assets", "decks");
const runtimePackages = (await readdir(packageDirectory))
  .filter((file) => file.endsWith(".fcrdeck"))
  .sort();
const registeredPackages = registry.map((entry) => entry.packageAsset).sort();
if (runtimePackages.join("\n") !== registeredPackages.join("\n")) {
  throw new Error("Runtime .fcrdeck files do not match bundled-deck-registry.json");
}

for (const entry of registry) {
  const bytes = await readFile(path.join(packageDirectory, entry.packageAsset));
  const document = new ArchiveDeckPackageReader().read(new Uint8Array(bytes));
  if (
    document.id !== entry.id ||
    document.version !== entry.version ||
    entry.packageAsset !== `${entry.id}.fcrdeck`
  ) {
    throw new Error(`Bundled registry/package mismatch for ${entry.packageAsset}`);
  }
}
console.log(`Verified ${registry.length} runtime deck package(s) without authoring inputs.`);
