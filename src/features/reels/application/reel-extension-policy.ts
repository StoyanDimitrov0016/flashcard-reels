import { FEED_ENGINE_CONFIG } from "@/features/reels/domain/feed-engine";
import { EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE } from "@/features/study/domain/review-attempts";

export function shouldExtendReelFeed(occurrenceIndex: number, occurrenceCount: number): boolean {
  return (
    occurrenceIndex >= 0 &&
    occurrenceCount - occurrenceIndex <= FEED_ENGINE_CONFIG.extensionThreshold
  );
}

export function getFirstEditableReelPosition(furthestReelPosition: number): number {
  return furthestReelPosition - EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE + 1;
}
