import type { AudioSource } from "expo-audio";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { useAnswerAudio } from "@/features/audio/presentation/hooks/use-answer-audio";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

type AnswerAudioPlayerProps = Readonly<{ isActive: boolean; source: AudioSource }>;

export function AnswerAudioPlayer({ isActive, source }: AnswerAudioPlayerProps) {
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
        <ActivityIndicator color={palette.ink} size="small" />
      ) : (
        <SymbolView
          name={
            status.playing
              ? { android: "pause", ios: "pause.fill", web: "pause" }
              : { android: "play_arrow", ios: "play.fill", web: "play_arrow" }
          }
          size={sizes.icon.medium}
          tintColor={palette.ink}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: palette.info,
    borderRadius: sizes.radius.pill,
    height: 48,
    justifyContent: "center",
    marginBottom: sizes.spacing.section,
    width: 48,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
});
