export const DeckImportFileNamePattern = /^deck-import-.*\.fcrdeck$/;

export function buildDeckImportFileName(timestamp: number): string {
  return `deck-import-${timestamp}.fcrdeck`;
}
