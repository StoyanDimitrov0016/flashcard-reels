import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { AudioSource } from "expo-audio";

import { useAnswerAudio } from "@/features/audio/hooks/use-answer-audio";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

type AnswerAudioPlayerProps = Readonly<{ isActive: boolean; source: AudioSource }>;

function formatTime(seconds: number): string {
  const roundedSeconds = Math.floor(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function AnswerAudioPlayer({ isActive, source }: AnswerAudioPlayerProps) {
  const { replay, status, togglePlayback } = useAnswerAudio(isActive ? source : null);

  if (!source) {
    return null;
  }

  const progress = status.duration > 0 ? Math.min(status.currentTime / status.duration, 1) : 0;
  const isLoading = !status.isLoaded && !status.error;
  const isDisabled = !status.isLoaded || Boolean(status.error);

  return (
    <View style={styles.player}>
      <Pressable
        accessibilityLabel={status.playing ? "Pause answer audio" : "Play answer audio"}
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={() => {
          void togglePlayback();
        }}
        style={({ pressed }) => [
          styles.playButton,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
        ]}
      >
        {status.isLoaded ? (
          <SymbolView
            name={
              status.playing
                ? { android: "pause", ios: "pause.fill", web: "pause" }
                : { android: "play_arrow", ios: "play.fill", web: "play_arrow" }
            }
            size={sizes.icon.small}
            tintColor={palette.ink}
          />
        ) : (
          <ActivityIndicator color={palette.ink} size="small" />
        )}
      </Pressable>
      <View style={styles.details}>
        <View style={styles.detailsHeader}>
          <Text style={styles.title}>{isLoading ? "Loading audio" : "Answer audio"}</Text>
          {isLoading ? (
            <Text style={styles.time}>Preparing...</Text>
          ) : (
            <Text style={styles.time}>
              {formatTime(status.currentTime)} / {formatTime(status.duration)}
            </Text>
          )}
        </View>
        <View style={styles.progressTrack}>
          {isLoading ? (
            <View style={styles.skeletonProgress} />
          ) : (
            <View style={[styles.progress, { width: `${progress * 100}%` }]} />
          )}
        </View>
      </View>
      <Pressable
        accessibilityLabel="Replay answer audio"
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={() => {
          void replay();
        }}
        style={({ pressed }) => [
          styles.replayButton,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
        ]}
      >
        <SymbolView
          name={{ android: "replay", ios: "arrow.counterclockwise", web: "replay" }}
          size={sizes.icon.small}
          tintColor={palette.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: palette.controlOverlay,
    borderColor: palette.controlBorder,
    borderRadius: sizes.radius.pill,
    borderWidth: sizes.border,
    flexDirection: "row",
    gap: sizes.spacing.section,
    marginBottom: sizes.spacing.section,
    maxWidth: 380,
    minHeight: 62,
    paddingHorizontal: sizes.spacing.large,
    paddingVertical: sizes.spacing.medium,
    width: "100%",
  },
  playButton: {
    alignItems: "center",
    backgroundColor: palette.info,
    borderRadius: sizes.radius.control,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  details: { flex: 1, gap: sizes.spacing.small },
  detailsHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { color: palette.textPrimary, fontSize: 12, fontWeight: "700" },
  progressTrack: {
    backgroundColor: palette.controlBorder,
    borderRadius: sizes.radius.small,
    height: 5,
    overflow: "hidden",
  },
  progress: { backgroundColor: palette.info, height: "100%" },
  skeletonProgress: {
    backgroundColor: palette.textMuted,
    height: "100%",
    opacity: 0.5,
    width: "42%",
  },
  time: { color: palette.textSecondary, fontSize: 11, fontVariant: ["tabular-nums"] },
  replayButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
});
