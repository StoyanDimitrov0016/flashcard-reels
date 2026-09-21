import { FEED_ENGINE_CONFIG } from "@/features/reels/domain/feed-engine";

export function shouldExtendReelFeed(occurrenceIndex: number, occurrenceCount: number): boolean {
  return (
    occurrenceIndex >= 0 &&
    occurrenceCount - occurrenceIndex <= FEED_ENGINE_CONFIG.extensionThreshold
  );
}
