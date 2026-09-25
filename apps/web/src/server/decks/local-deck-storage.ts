import "server-only";
import { open, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  DeckObjectPrefix,
  deckFileName,
  type DeckDownload,
  type DeckStorage,
  type StoredDeckObject,
} from "@/server/decks/deck-storage";

/** Serves `.fcrdeck` files from a folder so the portal runs without R2 in development. */
export function createLocalDeckStorage(directory: string): DeckStorage {
  const root = path.resolve(directory);
  const filePath = (key: string) => {
    const resolved = path.resolve(root, deckFileName(key));
    if (path.dirname(resolved) !== root) {
      throw new Error(`Deck key ${key} is outside the local deck folder`);
    }
    return resolved;
  };

  return {
    async listDeckObjects(): Promise<StoredDeckObject[]> {
      const entries = await readdir(root);
      const names = entries.filter((name) => name.endsWith(".fcrdeck"));
      return Promise.all(
        names.map(async (name) => {
          const details = await stat(path.join(root, name));
          return {
            key: DeckObjectPrefix + name,
            revision: `${details.size}:${details.mtimeMs}`,
            size: details.size,
          };
        })
      );
    },

    async readRange(key: string, start: number, end: number): Promise<Uint8Array> {
      const handle = await open(filePath(key), "r");
      try {
        const buffer = new Uint8Array(end - start);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
        return buffer.subarray(0, bytesRead);
      } finally {
        await handle.close();
      }
    },

    async createDownload(key: string): Promise<DeckDownload> {
      return {
        bytes: new Uint8Array(await readFile(filePath(key))),
        fileName: deckFileName(key),
        kind: "file",
      };
    },
  };
}
