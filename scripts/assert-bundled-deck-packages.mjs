import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "technical_flashcard_library");
const decks = JSON.parse(await readFile(path.join(sourceDirectory, "decks.json"), "utf8"));

await Promise.all(
  decks.map(async (deck) => {
    const packagePath = path.join(root, "assets", "decks", `${deck.id}.fcrdeck`);
    try {
      await access(packagePath);
    } catch {
      throw new Error(
        `Missing bundled deck package ${path.relative(root, packagePath)}; run npm run decks:packages`
      );
    }
  })
);

console.log(`Verified ${decks.length} bundled deck packages.`);
