import { EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE } from "@/features/study/domain/review-attempts";

export function getFirstEditableReelPosition(furthestReelPosition: number): number {
  return furthestReelPosition - EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE + 1;
}
