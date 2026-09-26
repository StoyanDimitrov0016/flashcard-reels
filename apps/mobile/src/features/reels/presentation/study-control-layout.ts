import type {
  AppPreferences,
  AudioSide,
  ControlSide,
  RatingDirection,
  RecollectionIslandPosition,
} from "@/features/preferences/domain/app-preferences";
import type { RecallLevel } from "@/features/study/domain/recall-level";

export type StudyControlOrientation = "horizontal" | "vertical";
export type StudyControlAudioPosition = "left" | "right" | "above" | "below";
export type StudyControlPlacement = StudyControlAudioPosition;

export type ResolvedStudyControlLayout = Readonly<{
  position: RecollectionIslandPosition;
  orientation: StudyControlOrientation;
  ratingOrder: readonly RecallLevel[];
  audioPosition: StudyControlAudioPosition;
  audioEnabled: boolean;
  readingPosition: StudyControlPlacement;
  readingEnabled: boolean;
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

/** Places a control before (primary) or after (opposite) the ratings along the island's axis. */
export function deriveControlPlacement(
  islandPosition: RecollectionIslandPosition,
  side: ControlSide
): StudyControlPlacement {
  if (islandPosition === "bottom") {
    return side === "primary" ? "left" : "right";
  }
  return side === "primary" ? "above" : "below";
}

export function deriveAudioPosition(
  islandPosition: RecollectionIslandPosition,
  audioSide: AudioSide
): StudyControlAudioPosition {
  return deriveControlPlacement(islandPosition, audioSide);
}

export function isBeforeRatings(placement: StudyControlPlacement): boolean {
  return placement === "left" || placement === "above";
}

export function resolveStudyControlLayout(
  preferences: Pick<
    AppPreferences,
    | "recollectionIslandPosition"
    | "ratingDirection"
    | "audioSide"
    | "audioEnabled"
    | "readingEnabled"
    | "readingSide"
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
    readingEnabled: preferences.readingEnabled,
    readingPosition: deriveControlPlacement(
      preferences.recollectionIslandPosition,
      preferences.readingSide
    ),
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

export function getControlSideLabel(islandPosition: RecollectionIslandPosition, side: ControlSide) {
  const horizontal = islandPosition === "bottom";
  if (horizontal) {
    return side === "primary" ? "Left" : "Right";
  }
  return side === "primary" ? "Top" : "Bottom";
}

export function getAudioSideLabel(
  islandPosition: RecollectionIslandPosition,
  audioSide: AudioSide
) {
  return getControlSideLabel(islandPosition, audioSide);
}
