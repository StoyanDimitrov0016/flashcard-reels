const deckOperationTails = new Map<string, Promise<unknown>>();

/** Serialize content and audio changes for one deck across installer/service instances. */
export async function withDeckOperation<T>(
  deckId: string,
  operation: () => Promise<T>
): Promise<T> {
  const previous = deckOperationTails.get(deckId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  deckOperationTails.set(deckId, current);
  try {
    return await current;
  } finally {
    if (deckOperationTails.get(deckId) === current) {
      deckOperationTails.delete(deckId);
    }
  }
}
