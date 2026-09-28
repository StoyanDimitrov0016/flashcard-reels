import type { ReactElement } from "react";

import { StyleSheet, View } from "react-native";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Rating } from "@/features/learning-engine/domain/rating";
import type { LessonId } from "@/features/lessons/domain/lesson.model";

import { FlashcardAudioPlayer } from "@/features/audio/presentation/components/flashcard-audio-player";
import { ReadingButton } from "@/features/lessons/presentation/components/reading-button";
import { useDeckLessons } from "@/features/lessons/presentation/context/deck-lessons-context";
import { RecallControls } from "@/features/reels/presentation/components/recall-controls";
import { useStudyControlLayout } from "@/features/reels/presentation/context/study-control-layout-context";
import { isBeforeRatings } from "@/features/reels/presentation/study-control-layout";
import { sizes } from "@/shared/presentation/sizes";

type StudyControlClusterProps = Readonly<{
  audioSource: AudioReference;
  deckId: DeckId;
  lessonId: LessonId | null;
  isActive: boolean;
  onRate: (rating: Rating) => void;
  ratingEnabled: boolean;
  selectedRating: Rating | null;
}>;

/** The ratings island with the audio and reading buttons on their chosen sides. */
export function StudyControlCluster({
  audioSource,
  deckId,
  lessonId,
  isActive,
  onRate,
  ratingEnabled,
  selectedRating,
}: StudyControlClusterProps) {
  const { audioEnabled, audioPosition, orientation, readingEnabled, readingPosition } =
    useStudyControlLayout();
  const { hasLesson } = useDeckLessons();
  const styles = createStyles(orientation);
  const before: ReactElement[] = [];
  const after: ReactElement[] = [];
  if (audioEnabled && audioSource !== null) {
    (isBeforeRatings(audioPosition) ? before : after).push(
      <FlashcardAudioPlayer isActive={isActive} key="audio" source={audioSource} />
    );
  }
  if (readingEnabled && lessonId && hasLesson(deckId, lessonId)) {
    // Reading sits outside audio when both share a side, so audio stays next to the ratings.
    const reading = <ReadingButton deckId={deckId} key="reading" lessonId={lessonId} />;
    if (isBeforeRatings(readingPosition)) {
      before.unshift(reading);
    } else {
      after.push(reading);
    }
  }

  // An empty spacer mirrors the busier side, so the ratings stay centered on the card.
  const spacerCount = Math.max(before.length, after.length);
  const spacer = <View style={getSpacerStyle(orientation, spacerCount)} />;

  return (
    <View style={styles.cluster}>
      {before.length > 0 ? <View style={styles.tools}>{before}</View> : spacerCount > 0 && spacer}
      <RecallControls
        onSelect={onRate}
        ratingEnabled={ratingEnabled}
        selectedRating={selectedRating}
      />
      {after.length > 0 ? <View style={styles.tools}>{after}</View> : spacerCount > 0 && spacer}
    </View>
  );
}

function getSpacerStyle(orientation: "horizontal" | "vertical", count: number) {
  const length = count * sizes.control.audio + Math.max(count - 1, 0) * sizes.spacing.medium;
  return orientation === "horizontal" ? { width: length } : { height: length };
}

function createStyles(orientation: "horizontal" | "vertical") {
  const horizontal = orientation === "horizontal";
  return StyleSheet.create({
    cluster: {
      alignItems: "center",
      // A bottom island spans the card so it can shrink on narrow phones; a side island hugs it.
      alignSelf: horizontal ? "stretch" : "auto",
      flexDirection: horizontal ? "row" : "column",
      flexShrink: 0,
      gap: horizontal ? sizes.spacing.medium : sizes.spacing.xLarge,
      justifyContent: "center",
    },
    tools: {
      alignItems: "center",
      flexDirection: horizontal ? "row" : "column",
      gap: sizes.spacing.medium,
    },
  });
}
