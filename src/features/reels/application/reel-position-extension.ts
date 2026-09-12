import { SESSION_COMPACTION_INTERVAL } from "@/features/study/domain/review-attempts";

export function shouldCompactSessionRuntimeData(
  previousFurthestReelPosition: number,
  nextFurthestReelPosition: number
): boolean {
  return (
    nextFurthestReelPosition > previousFurthestReelPosition &&
    Math.floor(nextFurthestReelPosition / SESSION_COMPACTION_INTERVAL) >
      Math.floor(previousFurthestReelPosition / SESSION_COMPACTION_INTERVAL)
  );
}

export async function completeReelActivation(
  persistPosition: () => Promise<boolean>,
  consumeRecurrence: () => Promise<void>,
  recordVisibleCard: () => Promise<void>,
  finalizeAttempts: () => Promise<void>,
  compactSession: () => Promise<void>,
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
  await compactSession();
  await extendFeed();
  return true;
}
