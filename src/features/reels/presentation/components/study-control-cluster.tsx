import { StyleSheet, View } from "react-native";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import { useStudyControlLayout } from "@/features/reels/presentation/context/study-control-layout-context";
import { RecallControls } from "@/features/reels/presentation/components/recall-controls";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import { sizes } from "@/shared/presentation/sizes";

type StudyControlClusterProps = Readonly<{
  audioSource: AudioReference;
  isActive: boolean;
  onRate: (level: RecallLevel) => void;
  selectedLevel: RecallLevel | null;
}>;

export function StudyControlCluster({
  audioSource,
  isActive,
  onRate,
  selectedLevel,
}: StudyControlClusterProps) {
  const { audioEnabled, audioPosition, orientation } = useStudyControlLayout();
  const styles = createStyles(orientation);
  const audio =
    audioEnabled && audioSource ? (
      <AnswerAudioPlayer isActive={isActive} source={audioSource} />
    ) : null;
  const controls = <RecallControls onSelect={onRate} selectedLevel={selectedLevel} />;

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
