import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/** File-system access only. The contract owns paths, format and validation. */
export async function readDeckSource(directory) {
  const files = {};
  async function visit(relative = "") {
    const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const file = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await visit(file);
        } else if (entry.isFile()) {
          files[file] = new Uint8Array(await readFile(path.join(directory, file)));
        } else {
          throw new Error(`Deck sources must contain regular files: ${file}`);
        }
      })
    );
  }
  await visit();
  return files;
}
