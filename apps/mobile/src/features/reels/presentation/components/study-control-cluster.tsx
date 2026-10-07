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
import {
  arrangeStudyTools,
  type StudyTool,
} from "@/features/reels/presentation/study-control-layout";
import { sizes } from "@/shared/presentation/sizes";

type StudyControlClusterProps = Readonly<{
  audioSource: AudioReference;
  deckId: DeckId;
  lessonId: LessonId | null;
  lessonSectionId?: string | null;
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
  lessonSectionId,
  isActive,
  onRate,
  ratingEnabled,
  selectedRating,
}: StudyControlClusterProps) {
  const { audioEnabled, audioPosition, orientation, readingEnabled, readingPosition } =
    useStudyControlLayout();
  const { hasLesson } = useDeckLessons();
  const styles = createStyles(orientation);
  const readingLessonId =
    readingEnabled && lessonId && hasLesson(deckId, lessonId) ? lessonId : null;
  const { before, after } = arrangeStudyTools({
    audio: audioEnabled && audioSource !== null ? audioPosition : null,
    reading: readingLessonId === null ? null : readingPosition,
  });
  // An empty spacer mirrors the busier side, so the ratings stay centered on the card.
  const spacerCount = Math.max(before.length, after.length);
  const side = {
    audioSource,
    deckId,
    isActive,
    lessonId: readingLessonId,
    lessonSectionId,
    orientation,
    spacerCount,
  };

  return (
    <View style={styles.cluster}>
      <ClusterSide {...side} tools={before} />
      <RecallControls
        onSelect={onRate}
        ratingEnabled={ratingEnabled}
        selectedRating={selectedRating}
      />
      <ClusterSide {...side} tools={after} />
    </View>
  );
}

type ClusterSideProps = Readonly<{
  audioSource: AudioReference;
  deckId: DeckId;
  isActive: boolean;
  lessonId: LessonId | null;
  lessonSectionId?: string | null;
  orientation: "horizontal" | "vertical";
  spacerCount: number;
  tools: readonly StudyTool[];
}>;

/** One side of the ratings: its tools, or a spacer matching the busier side. */
function ClusterSide({
  audioSource,
  deckId,
  isActive,
  lessonId,
  lessonSectionId,
  orientation,
  spacerCount,
  tools,
}: ClusterSideProps) {
  const styles = createStyles(orientation);

  if (tools.length === 0 && spacerCount === 0) {
    return null;
  }
  if (tools.length === 0) {
    return <View style={getSpacerStyle(orientation, spacerCount)} />;
  }

  return (
    <View style={styles.tools}>
      {tools.map((tool) => {
        if (tool === "audio") {
          return (
            audioSource !== null && (
              <FlashcardAudioPlayer isActive={isActive} key="audio" source={audioSource} />
            )
          );
        }
        return (
          lessonId !== null && (
            <ReadingButton
              deckId={deckId}
              key="reading"
              lessonId={lessonId}
              sectionId={lessonSectionId}
            />
          )
        );
      })}
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
