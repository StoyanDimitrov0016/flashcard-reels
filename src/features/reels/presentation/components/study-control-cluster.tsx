import { StyleSheet, View } from "react-native";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import type {
  AudioSide,
  RatingDirection,
  RecollectionIslandPosition,
} from "@/features/preferences/domain/app-preferences";
import { RecallControls } from "@/features/reels/presentation/components/recall-controls";
import {
  deriveAudioPosition,
  deriveIslandOrientation,
  deriveRatingOrder,
} from "@/features/reels/presentation/study-control-layout";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import { sizes } from "@/shared/presentation/sizes";

type StudyControlClusterProps = Readonly<{
  audioEnabled: boolean;
  audioSide: AudioSide;
  audioSource: AudioReference;
  isActive: boolean;
  onRate: (level: RecallLevel) => void;
  position: RecollectionIslandPosition;
  ratingDirection: RatingDirection;
  selectedLevel: RecallLevel | null;
}>;

export function StudyControlCluster({
  audioEnabled,
  audioSide,
  audioSource,
  isActive,
  onRate,
  position,
  ratingDirection,
  selectedLevel,
}: StudyControlClusterProps) {
  const orientation = deriveIslandOrientation(position);
  const audioPosition = deriveAudioPosition(position, audioSide);
  const styles = createStyles(position, orientation, audioPosition);
  const audio =
    audioEnabled && audioSource ? (
      <AnswerAudioPlayer isActive={isActive} source={audioSource} />
    ) : null;
  const controls = (
    <RecallControls
      onSelect={onRate}
      orientation={orientation}
      ratingOrder={deriveRatingOrder(ratingDirection)}
      selectedLevel={selectedLevel}
    />
  );

  return (
    <View style={styles.cluster}>
      {audioPosition === "left" || audioPosition === "above" ? audio : null}
      {controls}
      {audioPosition === "right" || audioPosition === "below" ? audio : null}
    </View>
  );
}

function createStyles(
  position: RecollectionIslandPosition,
  orientation: "horizontal" | "vertical",
  audioPosition: "left" | "right" | "above" | "below"
) {
  return StyleSheet.create({
    cluster: {
      alignItems: "center",
      bottom: position === "bottom" ? sizes.spacing.spacious + 44 : undefined,
      flexDirection: orientation === "horizontal" ? "row" : "column",
      gap: sizes.spacing.xLarge,
      left: position === "bottom" ? sizes.spacing.spacious : undefined,
      position: "absolute",
      right: position === "right" || position === "bottom" ? sizes.spacing.spacious : undefined,
      top: position === "bottom" ? undefined : "32%",
      ...(position === "left" ? { left: sizes.spacing.spacious } : {}),
      ...(audioPosition === "left" || audioPosition === "right"
        ? { justifyContent: "center" as const }
        : {}),
    },
  });
}
