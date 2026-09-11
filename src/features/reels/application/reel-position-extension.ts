export async function persistPositionThenExtend(
  persistPosition: () => Promise<boolean>,
  extendFeed: () => Promise<void>
): Promise<boolean> {
  if (!(await persistPosition())) {
    return false;
  }
  await extendFeed();
  return true;
}

export function createSingleFlightRequest(operation: () => Promise<void>): () => Promise<void> {
  let inFlight: Promise<void> | null = null;
  return () => {
    if (!inFlight) {
      inFlight = Promise.resolve()
        .then(operation)
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  };
}

export async function completeReelActivation(
  persistPosition: () => Promise<boolean>,
  consumeRecurrence: () => Promise<void>,
  recordVisibleCard: () => Promise<void>,
  finalizeAttempts: () => Promise<void>,
  extendFeed: () => Promise<void>,
  awaitPendingRatings: () => Promise<void> = async () => undefined
): Promise<boolean> {
  if (!(await persistPosition())) {
    return false;
  }
  await consumeRecurrence();
  await recordVisibleCard();
  await awaitPendingRatings();
  await finalizeAttempts();
  await extendFeed();
  return true;
}
