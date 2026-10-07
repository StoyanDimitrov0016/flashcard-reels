import type {
  AppPreferences,
  ControlSide,
  RatingDirection,
  StudyIslandPosition,
} from "@/features/preferences/domain/app-preferences";

import { type Rating, ratingValues } from "@/features/learning-engine/domain/rating";

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

const canonicalRatingOrder: readonly Rating[] = ratingValues;
const reverseRatingOrder: readonly Rating[] = ratingValues.reduce<Rating[]>((order, rating) => {
  order.unshift(rating);
  return order;
}, []);

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

function isBeforeRatings(placement: StudyControlPlacement): boolean {
  return placement === "left" || placement === "above";
}

export type StudyTool = "audio" | "reading";

type StudyToolPlacements = Readonly<{
  audio: StudyControlPlacement | null;
  reading: StudyControlPlacement | null;
}>;

/**
 * Splits the shown tools around the ratings. When both share a side, reading sits outside audio,
 * so audio stays next to the ratings. A null placement hides that tool.
 */
export function arrangeStudyTools({
  audio,
  reading,
}: StudyToolPlacements): Readonly<{ before: StudyTool[]; after: StudyTool[] }> {
  const before: StudyTool[] = [];
  const after: StudyTool[] = [];
  if (audio !== null) {
    (isBeforeRatings(audio) ? before : after).push("audio");
  }
  if (reading !== null) {
    if (isBeforeRatings(reading)) {
      before.unshift("reading");
    } else {
      after.push("reading");
    }
  }

  return { before, after };
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
