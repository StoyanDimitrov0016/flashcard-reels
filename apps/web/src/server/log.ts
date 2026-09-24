import "server-only";

/** Server-side diagnostics end up in the hosting platform's logs. */
export function logServerError(message: string, error: unknown): void {
  // oxlint-disable-next-line no-console -- the single sink for server diagnostics
  console.error(`[flashcard-reels] ${message}`, error);
}
