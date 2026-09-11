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
  const styles = createStyles(orientation);
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

function createStyles(orientation: "horizontal" | "vertical") {
  return StyleSheet.create({
    cluster: {
      alignItems: "center",
      flexDirection: orientation === "horizontal" ? "row" : "column",
      gap: orientation === "horizontal" ? sizes.spacing.small : sizes.spacing.xLarge,
      flexShrink: 0,
    },
  });
}
