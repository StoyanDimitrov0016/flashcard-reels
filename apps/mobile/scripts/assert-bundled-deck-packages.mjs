import { parseDeckPackage } from "@flashcard-reels/deck-contract";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const registry = JSON.parse(
  await readFile(path.join(root, "src", "infrastructure", "bundled-deck-registry.json"), "utf8")
);
if (!Array.isArray(registry) || registry.length === 0) {
  throw new Error("Bundled deck registry must contain at least one entry");
}

const packageDirectory = path.join(root, "assets", "decks");
const packageFileNames = await readdir(packageDirectory);
const runtimePackages = packageFileNames.filter((file) => file.endsWith(".fcrdeck")).toSorted();
const registeredPackages = registry.map((entry) => entry.packageAsset).toSorted();
if (runtimePackages.join("\n") !== registeredPackages.join("\n")) {
  throw new Error("Runtime .fcrdeck files do not match bundled-deck-registry.json");
}

for (const entry of registry) {
  const bytes = await readFile(path.join(packageDirectory, entry.packageAsset));
  const document = parseDeckPackage(new Uint8Array(bytes)).deck;
  if (
    document.id !== entry.id ||
    document.revision !== entry.revision ||
    entry.packageAsset !== `${entry.id}.fcrdeck`
  ) {
    throw new Error(`Bundled registry/package mismatch for ${entry.packageAsset}`);
  }
}
console.log(`Verified ${registry.length} runtime deck package(s) without authoring inputs.`);
