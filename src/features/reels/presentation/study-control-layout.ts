import type {
  AppPreferences,
  AudioSide,
  RatingDirection,
  RecollectionIslandPosition,
} from "@/features/preferences/domain/app-preferences";
import type { RecallLevel } from "@/features/study/domain/recall-level";

export type StudyControlOrientation = "horizontal" | "vertical";
export type StudyControlAudioPosition = "left" | "right" | "above" | "below";

export type ResolvedStudyControlLayout = Readonly<{
  position: RecollectionIslandPosition;
  orientation: StudyControlOrientation;
  ratingOrder: readonly RecallLevel[];
  audioPosition: StudyControlAudioPosition;
  audioEnabled: boolean;
}>;

const canonicalRatingOrder: readonly RecallLevel[] = ["again", "hard", "good", "easy"];
const reverseRatingOrder: readonly RecallLevel[] = ["easy", "good", "hard", "again"];

export function deriveIslandOrientation(
  position: RecollectionIslandPosition
): StudyControlOrientation {
  return position === "bottom" ? "horizontal" : "vertical";
}

export function deriveRatingOrder(direction: RatingDirection): readonly RecallLevel[] {
  return direction === "forward" ? canonicalRatingOrder : reverseRatingOrder;
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

export function resolveStudyControlLayout(
  preferences: Pick<
    AppPreferences,
    "recollectionIslandPosition" | "ratingDirection" | "audioSide" | "audioEnabled"
  >
): ResolvedStudyControlLayout {
  return {
    audioEnabled: preferences.audioEnabled,
    audioPosition: deriveAudioPosition(
      preferences.recollectionIslandPosition,
      preferences.audioSide
    ),
    orientation: deriveIslandOrientation(preferences.recollectionIslandPosition),
    position: preferences.recollectionIslandPosition,
    ratingOrder: deriveRatingOrder(preferences.ratingDirection),
  };
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

export function getAudioSideLabel(
  islandPosition: RecollectionIslandPosition,
  audioSide: AudioSide
) {
  const horizontal = islandPosition === "bottom";
  if (horizontal) {
    return audioSide === "primary" ? "Left" : "Right";
  }
  return audioSide === "primary" ? "Top" : "Bottom";
}
