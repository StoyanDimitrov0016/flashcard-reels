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

export async function completeReelActivation(
  persistPosition: () => Promise<boolean>,
  consumeRecurrence: () => Promise<void>,
  recordVisibleCard: () => Promise<void>,
  finalizeAttempts: () => Promise<void>,
  extendFeed: () => Promise<void>
): Promise<boolean> {
  if (!(await persistPosition())) {
    return false;
  }
  await consumeRecurrence();
  await recordVisibleCard();
  await finalizeAttempts();
  await extendFeed();
  return true;
}
