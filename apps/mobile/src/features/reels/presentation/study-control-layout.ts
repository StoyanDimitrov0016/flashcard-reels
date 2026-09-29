import type { Rating } from "@/features/learning-engine/domain/rating";
import type {
  AppPreferences,
  ControlSide,
  RatingDirection,
  StudyIslandPosition,
} from "@/features/preferences/domain/app-preferences";

type StudyControlOrientation = "horizontal" | "vertical";
type StudyControlAudioPosition = "left" | "right" | "above" | "below";
export type StudyControlPlacement = StudyControlAudioPosition;

export type ResolvedStudyControlLayout = Readonly<{
  position: StudyIslandPosition;
  orientation: StudyControlOrientation;
  ratingOrder: readonly Rating[];
  audioPosition: StudyControlAudioPosition;
  audioEnabled: boolean;
  readingPosition: StudyControlPlacement;
  readingEnabled: boolean;
}>;

const canonicalRatingOrder: readonly Rating[] = ["again", "hard", "good", "easy"];
const reverseRatingOrder: readonly Rating[] = ["easy", "good", "hard", "again"];

function deriveIslandOrientation(position: StudyIslandPosition): StudyControlOrientation {
  return position === "bottom" ? "horizontal" : "vertical";
}

function deriveRatingOrder(direction: RatingDirection): readonly Rating[] {
  return direction === "forward" ? canonicalRatingOrder : reverseRatingOrder;
}

/** Places a control before (primary) or after (opposite) the ratings along the island's axis. */
export function deriveControlPlacement(
  islandPosition: StudyIslandPosition,
  side: ControlSide
): StudyControlPlacement {
  if (islandPosition === "bottom") {
    return side === "primary" ? "left" : "right";
  }
  return side === "primary" ? "above" : "below";
}

export function isBeforeRatings(placement: StudyControlPlacement): boolean {
  return placement === "left" || placement === "above";
}

export function resolveStudyControlLayout(
  preferences: Pick<
    AppPreferences,
    | "studyIslandPosition"
    | "ratingDirection"
    | "audioSide"
    | "audioEnabled"
    | "readingEnabled"
    | "readingSide"
  >
): ResolvedStudyControlLayout {
  return {
    audioEnabled: preferences.audioEnabled,
    audioPosition: deriveControlPlacement(preferences.studyIslandPosition, preferences.audioSide),
    orientation: deriveIslandOrientation(preferences.studyIslandPosition),
    position: preferences.studyIslandPosition,
    ratingOrder: deriveRatingOrder(preferences.ratingDirection),
    readingEnabled: preferences.readingEnabled,
    readingPosition: deriveControlPlacement(
      preferences.studyIslandPosition,
      preferences.readingSide
    ),
  };
}

export function getRatingDirectionLabel(
  islandPosition: StudyIslandPosition,
  direction: RatingDirection
): string {
  const horizontal = islandPosition === "bottom";
  if (horizontal) {
    return direction === "forward" ? "Left → Right" : "Right → Left";
  }
  return direction === "forward" ? "Top → Bottom" : "Bottom → Top";
}

export function getControlSideLabel(islandPosition: StudyIslandPosition, side: ControlSide) {
  const horizontal = islandPosition === "bottom";
  if (horizontal) {
    return side === "primary" ? "Left" : "Right";
  }
  return side === "primary" ? "Top" : "Bottom";
}
