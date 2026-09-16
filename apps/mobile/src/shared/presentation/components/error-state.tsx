import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAppColors, type AppColors } from "@/shared/presentation/theme-colors";
import { AppResetAction } from "@/shared/presentation/components/app-reset-action";
import { describeError } from "@/shared/application/error-details";
import { sizes } from "@/shared/presentation/sizes";
import { fontWeight, textStyles } from "@/shared/presentation/typography";

type ErrorStateProps = Readonly<{
  onHomeAction?: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  homeActionLabel?: string;
  title: string;
  error?: Error;
}>;

export function ErrorState({
  onHomeAction,
  onPrimaryAction,
  primaryActionLabel,
  homeActionLabel,
  title,
  error,
}: ErrorStateProps) {
  const colors = getAppColors(useColorScheme() === "dark" ? "dark" : "light");
  const styles = createStyles(colors);
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(
    function reportOriginalError() {
      if (error) {
        // oxlint-disable-next-line no-console -- Preserve the original exception in device logs.
        console.error("[Flashcard Reels] Route failure", describeError(error));
      }
    },
    [error]
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <View style={styles.actionRow}>
          {onHomeAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={onHomeAction}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryLabel}>{homeActionLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={onPrimaryAction}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryLabel}>{primaryActionLabel}</Text>
          </Pressable>
        </View>
        {error ? (
          <>
            <Text style={styles.secondaryLabel}>
              Retrying does not erase your data. Try again or use recovery below.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDetailsVisible(!detailsVisible)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryLabel}>
                {detailsVisible ? "Hide error details" : "Show error details"}
              </Text>
            </Pressable>
            {detailsVisible ? (
              <Text selectable style={styles.secondaryLabel}>
                {`App ${Constants.expoConfig?.version ?? "unknown"} · ${Platform.OS} ${Platform.Version}\n${describeError(error)}`}
              </Text>
            ) : null}
          </>
        ) : null}
        <AppResetAction />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.canvas, flex: 1 },
    content: {
      alignItems: "center",
      backgroundColor: colors.canvas,
      flexGrow: 1,
      gap: sizes.spacing.section,
      justifyContent: "center",
      padding: sizes.spacing.spacious,
    },
    title: {
      color: colors.textPrimary,
      textAlign: "center",
      ...textStyles.screenTitle,
    },
    actionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      justifyContent: "center",
      marginTop: sizes.spacing.wide,
      width: "100%",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.pill,
      flex: 1,
      paddingHorizontal: sizes.spacing.content,
      paddingVertical: sizes.spacing.xLarge,
    },
    primaryLabel: {
      color: colors.actionPrimaryText,
      ...textStyles.primaryButtonLabel,
    },
    secondaryButton: {
      alignItems: "center",
      flex: 1,
      paddingHorizontal: sizes.spacing.section,
      paddingVertical: sizes.spacing.medium,
    },
    secondaryLabel: {
      color: colors.textSecondary,
      fontWeight: fontWeight.bold,
    },
  });
}
