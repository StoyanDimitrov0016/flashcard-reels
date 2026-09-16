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
  ratingEnabled: boolean;
  selectedLevel: RecallLevel | null;
}>;

export function StudyControlCluster({
  audioSource,
  isActive,
  onRate,
  ratingEnabled,
  selectedLevel,
}: StudyControlClusterProps) {
  const { audioEnabled, audioPosition, orientation } = useStudyControlLayout();
  const styles = createStyles(orientation);
  const showAudio = audioEnabled && audioSource !== null;
  const audioBeforeControls = audioPosition === "left" || audioPosition === "above";

  return (
    <View style={styles.cluster}>
      {showAudio && audioBeforeControls && (
        <AnswerAudioPlayer isActive={isActive} source={audioSource} />
      )}
      <RecallControls
        onSelect={onRate}
        ratingEnabled={ratingEnabled}
        selectedLevel={selectedLevel}
      />
      {showAudio && !audioBeforeControls && (
        <AnswerAudioPlayer isActive={isActive} source={audioSource} />
      )}
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
