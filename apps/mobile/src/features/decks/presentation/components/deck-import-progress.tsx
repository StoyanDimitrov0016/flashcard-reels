import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckDownloadProgress } from "@/features/decks/presentation/controllers/use-import-deck-package";

import { formatBytes } from "@/shared/presentation/format/format-bytes";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type DeckImportProgressProps = Readonly<{
  /** Present for QR imports; stops the download. */
  onCancel?: () => void;
  phase: "downloading" | "installing";
  progress: DeckDownloadProgress | null;
  /** QR imports download and then install; file imports only install. */
  showSteps: boolean;
}>;

/** What happens while a deck arrives: a real byte count while downloading, then installation. */
export function DeckImportProgress({
  onCancel,
  phase,
  progress,
  showSteps,
}: DeckImportProgressProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const downloading = phase === "downloading";
  const fraction =
    downloading && progress?.totalBytes
      ? Math.min(progress.bytesWritten / progress.totalBytes, 1)
      : null;

  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <View style={styles.iconShell}>
        <SymbolView
          name={
            downloading
              ? { android: "download", ios: "arrow.down.circle", web: "download" }
              : { android: "inventory_2", ios: "shippingbox", web: "inventory_2" }
          }
          size={sizes.icon.medium}
          tintColor={colors.textPrimary}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{downloading ? "Downloading deck" : "Installing deck"}</Text>
        <Text style={styles.detail}>{describeProgress(downloading, progress)}</Text>
      </View>
      <ProgressBar fraction={fraction} />
      {showSteps && (
        <View style={styles.steps}>
          <Step active={downloading} done={!downloading} label="Download" number={1} />
          <View style={styles.stepLine} />
          <Step active={!downloading} done={false} label="Install" number={2} />
        </View>
      )}
      {!!onCancel && downloading && (
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelLabel}>Cancel download</Text>
        </Pressable>
      )}
    </View>
  );
}

function describeProgress(downloading: boolean, progress: DeckDownloadProgress | null): string {
  if (!downloading) {
    return "Checking cards, lessons, and audio";
  }
  if (progress?.totalBytes) {
    return `${formatBytes(progress.bytesWritten)} of ${formatBytes(progress.totalBytes)}`;
  }
  return progress ? `${formatBytes(progress.bytesWritten)} received` : "Connecting…";
}

type ProgressBarProps = Readonly<{ fraction: number | null }>;

/** Fills to `fraction`, or sweeps continuously while the size is unknown. */
function ProgressBar({ fraction }: ProgressBarProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [trackWidth, setTrackWidth] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;
  const indeterminate = fraction === null;

  useEffect(
    function sweepWhileIndeterminate() {
      if (!indeterminate) {
        return undefined;
      }
      const loop = Animated.loop(
        Animated.timing(sweep, {
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        })
      );
      sweep.setValue(0);
      loop.start();
      return function stopSweep() {
        loop.stop();
      };
    },
    [indeterminate, sweep]
  );

  const segment = trackWidth * 0.35;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={
        fraction === null ? undefined : { max: 100, min: 0, now: Math.round(fraction * 100) }
      }
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={styles.track}
    >
      {fraction === null ? (
        <Animated.View
          style={[
            styles.fill,
            {
              transform: [
                {
                  translateX: sweep.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-segment, trackWidth],
                  }),
                },
              ],
              width: segment,
            },
          ]}
        />
      ) : (
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      )}
    </View>
  );
}

type StepProps = Readonly<{ active: boolean; done: boolean; label: string; number: number }>;

function Step({ active, done, label, number }: StepProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const reached = active || done;

  return (
    <View style={styles.step}>
      <View style={[styles.stepBadge, reached && styles.stepBadgeReached]}>
        {done ? (
          <SymbolView
            name={{ android: "check", ios: "checkmark", web: "check" }}
            size={12}
            tintColor={colors.actionPrimaryText}
          />
        ) : (
          <Text style={[styles.stepNumber, reached && styles.stepNumberReached]}>{number}</Text>
        )}
      </View>
      <Text style={[styles.stepLabel, reached && styles.stepLabelReached]}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    cancel: {
      alignItems: "center",
      borderColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      borderWidth: sizes.border,
      justifyContent: "center",
      marginTop: sizes.spacing.small,
      minHeight: sizes.touchTarget.minimum,
      paddingHorizontal: sizes.spacing.content,
    },
    cancelLabel: {
      color: colors.textPrimary,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    container: {
      alignItems: "center",
      gap: sizes.spacing.section,
      paddingVertical: sizes.spacing.screen,
    },
    copy: { alignItems: "center", gap: sizes.spacing.xSmall },
    detail: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      fontVariant: ["tabular-nums"],
      lineHeight: lineHeight.body,
    },
    fill: {
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.pill,
      height: "100%",
    },
    iconShell: {
      alignItems: "center",
      backgroundColor: colors.surfaceSubtle,
      borderRadius: sizes.radius.pill,
      height: sizes.iconBadge.medium,
      justifyContent: "center",
      width: sizes.iconBadge.medium,
    },
    step: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.small },
    stepBadge: {
      alignItems: "center",
      backgroundColor: colors.surfaceSubtle,
      borderRadius: sizes.radius.pill,
      height: 20,
      justifyContent: "center",
      width: 20,
    },
    stepBadgeReached: { backgroundColor: colors.actionPrimary },
    stepLabel: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
    },
    stepLabelReached: { color: colors.textPrimary },
    stepLine: { backgroundColor: colors.borderStrong, height: 1, width: 28 },
    stepNumber: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
    },
    stepNumberReached: { color: colors.actionPrimaryText },
    steps: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.medium },
    title: { color: colors.textPrimary, fontSize: fontSize.bodyLarge, fontWeight: fontWeight.bold },
    track: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: sizes.radius.pill,
      height: 6,
      overflow: "hidden",
      width: "100%",
    },
  });
}
