import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "technical_flashcard_library");
const assetDirectory = path.join(root, "assets", "audio", "technical");
const cards = JSON.parse(await readFile(path.join(sourceDirectory, "flashcards.json"), "utf8"));
const files = new Set(await readdir(assetDirectory));

const expected = cards.map((card) => `${card.id}.mp3`);
const missing = expected.filter((file) => !files.has(file));
if (missing.length > 0) {
  throw new Error(`Cannot build audio module; ${missing.length} MP3 files are missing.`);
}

const imports = [];
const answerEntries = [];
for (const card of cards) {
  const fileName = `${card.id}.mp3`;
  await access(path.join(assetDirectory, fileName));
  const variable = `audio${card.id.replaceAll("-", "")}`;
  imports.push(`import ${variable} from "../../../../assets/audio/technical/${fileName}";`);
  answerEntries.push(`  ${JSON.stringify(card.id)}: ${variable}`);
}

const moduleSource = `import type { AudioSource } from "expo-audio";

${imports.join("\n")}

export const answerAudioAssets: Readonly<Record<string, AudioSource>> = {
${answerEntries.join(",\n")}
};
`;

await writeFile(
  path.join(root, "src", "features", "audio", "infrastructure", "audio-assets.ts"),
  moduleSource
);
console.log(`Generated audio asset module for ${cards.length} flashcards.`);
