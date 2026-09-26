/** A published `.fcrdeck` object. `revision` changes whenever the object's bytes change. */
export type StoredDeckObject = Readonly<{ key: string; size: number; revision: string }>;

export type DeckDownload =
  | Readonly<{ kind: "redirect"; url: string }>
  | Readonly<{ kind: "file"; bytes: Uint8Array; fileName: string }>;

/** Where published deck packages live: private R2 in production, a local folder in development. */
export interface DeckStorage {
  listDeckObjects(): Promise<StoredDeckObject[]>;
  /** Reads `[start, end)` from an object without downloading the rest of it. */
  readRange(key: string, start: number, end: number): Promise<Uint8Array>;
  createDownload(key: string): Promise<DeckDownload>;
}

export const DeckObjectPrefix = "decks/";

export function deckFileName(key: string): string {
  return key.slice(key.lastIndexOf("/") + 1);
}
