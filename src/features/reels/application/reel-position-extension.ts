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
