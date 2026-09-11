import type { AudioSide, RatingDirection, RecollectionIslandPosition } from "@/features/preferences/domain/app-preferences";
import type { RecallLevel } from "@/features/study/domain/recall-level";

export type StudyControlOrientation = "horizontal" | "vertical";
export type StudyControlAudioPosition = "left" | "right" | "above" | "below";

const canonicalRatingOrder: readonly RecallLevel[] = ["again", "hard", "good", "easy"];

export function deriveIslandOrientation(
  position: RecollectionIslandPosition
): StudyControlOrientation {
  return position === "bottom" ? "horizontal" : "vertical";
}

export function deriveRatingOrder(direction: RatingDirection): readonly RecallLevel[] {
  return direction === "forward" ? canonicalRatingOrder : [...canonicalRatingOrder].reverse();
}

export function deriveAudioPosition(
  islandPosition: RecollectionIslandPosition,
  audioSide: AudioSide
): StudyControlAudioPosition {
  if (islandPosition === "bottom") {
    return audioSide === "primary" ? "left" : "right";
  }
  return audioSide === "primary" ? "above" : "below";
}

export function getRatingDirectionLabel(
  islandPosition: RecollectionIslandPosition,
  direction: RatingDirection
): string {
  const horizontal = islandPosition === "bottom";
  if (horizontal) {
    return direction === "forward" ? "Left → Right" : "Right → Left";
  }
  return direction === "forward" ? "Top → Bottom" : "Bottom → Top";
}

export function getAudioSideLabel(islandPosition: RecollectionIslandPosition, audioSide: AudioSide) {
  const horizontal = islandPosition === "bottom";
  if (horizontal) {
    return audioSide === "primary" ? "Left" : "Right";
  }
  return audioSide === "primary" ? "Top" : "Bottom";
}
