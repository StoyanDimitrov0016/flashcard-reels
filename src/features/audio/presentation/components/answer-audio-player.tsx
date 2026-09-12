import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { useAnswerAudio } from "@/features/audio/presentation/hooks/use-answer-audio";
import type { AudioReference } from "@/features/audio/domain/audio-reference";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";

type AnswerAudioPlayerProps = Readonly<{ isActive: boolean; source: AudioReference }>;

export function AnswerAudioPlayer({ isActive, source }: AnswerAudioPlayerProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { status, togglePlayback } = useAnswerAudio(isActive ? source : null);

  if (!source) {
    return null;
  }

  const isLoading = !status.isLoaded && !status.error;
  const isDisabled = !status.isLoaded || Boolean(status.error);
  const finished =
    status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration);
  let accessibilityLabel = "Play answer audio";
  if (status.error) {
    accessibilityLabel = "Answer audio unavailable";
  } else if (isLoading) {
    accessibilityLabel = "Preparing answer audio";
  } else if (status.playing) {
    accessibilityLabel = "Pause answer audio";
  } else if (finished) {
    accessibilityLabel = "Replay answer audio";
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => void togglePlayback()}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.textPrimary} size="small" />
      ) : (
        <SymbolView
          name={
            status.playing
              ? { android: "pause", ios: "pause.fill", web: "pause" }
              : { android: "play_arrow", ios: "play.fill", web: "play_arrow" }
          }
          size={sizes.icon.medium}
          tintColor={colors.textPrimary}
        />
      )}
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    button: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      height: sizes.control.audio,
      justifyContent: "center",
      width: sizes.control.audio,
    },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.72 },
  });
}
