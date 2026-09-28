export function isFirstReviewOnLocalDay(lastReviewAt: string | null, reviewedAt: string): boolean {
  if (lastReviewAt === null) {
    return true;
  }

  const previous = new Date(lastReviewAt);
  const current = new Date(reviewedAt);
  return (
    previous.getFullYear() !== current.getFullYear() ||
    previous.getMonth() !== current.getMonth() ||
    previous.getDate() !== current.getDate()
  );
}
