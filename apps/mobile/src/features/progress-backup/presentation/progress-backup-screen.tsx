import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ProgressBackupSummary } from "@/features/progress-backup/contracts/progress-backup.schema";

import {
  PreferenceRow,
  PreferenceSection,
} from "@/features/preferences/presentation/components/preference-settings-components";
import {
  useProgressBackupController,
  type PreparedProgressRestore,
} from "@/features/progress-backup/presentation/controllers/use-progress-backup-controller";
import { DestructiveConfirmationSheet } from "@/shared/presentation/components/destructive-confirmation-sheet";
import { SubScreenHeader } from "@/shared/presentation/components/sub-screen-header";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, lineHeight } from "@/shared/presentation/typography";

export default function ProgressBackupScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const {
    busy,
    prepared,
    hasSafetyCopy,
    error,
    exportProgress,
    pickBackup,
    restore,
    shareSafetyCopy,
    cancelRestore,
  } = useProgressBackupController();

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <SubScreenHeader
        backLabel="Back to Controls"
        onBack={() => router.back()}
        title="Progress backup"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Save your learning progress to a file, or restore it on another device.
        </Text>
        <PreferenceSection footnote="Backups include reviews, schedules, and archived progress, but not decks, audio, or preferences. Files are readable and not password protected.">
          <PreferenceRow
            detail="Finishes current study sessions, then shares a progress file"
            disabled={busy}
            icon={{ android: "upload_file", ios: "square.and.arrow.up", web: "upload_file" }}
            onPress={() => void exportProgress()}
            title="Export progress"
          />
          <PreferenceRow
            detail="Preview a file before replacing progress on this device"
            disabled={busy}
            icon={{ android: "download", ios: "square.and.arrow.down", web: "download" }}
            onPress={() => void pickBackup()}
            title="Import progress"
          />
          {hasSafetyCopy && (
            <PreferenceRow
              detail="Saved automatically before the last import"
              disabled={busy}
              icon={{ android: "history", ios: "clock.arrow.circlepath", web: "history" }}
              onPress={() => void shareSafetyCopy()}
              title="Share previous progress backup"
            />
          )}
        </PreferenceSection>
        {busy && !prepared && <Text style={styles.description}>Working on progress backup…</Text>}
        {error && !prepared && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
      </ScrollView>
      <DestructiveConfirmationSheet
        actionLabel="Replace progress"
        busy={busy}
        error={prepared ? error : null}
        icon={{ android: "restore", ios: "arrow.counterclockwise", web: "restore" }}
        message={prepared ? restorePreview(prepared) : ""}
        onCancel={cancelRestore}
        onConfirm={() => void restore()}
        title="Replace learning progress?"
        visible={prepared !== null}
      />
    </SafeAreaView>
  );
}

function describeSummary(summary: ProgressBackupSummary): string {
  const latest = summary.lastReviewedAt
    ? ` Last reviewed ${new Date(summary.lastReviewedAt).toLocaleDateString()}.`
    : "";
  return `${summary.deckCount} studied ${summary.deckCount === 1 ? "deck" : "decks"} and ${summary.reviewCount} ${summary.reviewCount === 1 ? "review" : "reviews"}.${latest}`;
}

function restorePreview(prepared: PreparedProgressRestore): string {
  return `Backup: ${describeSummary(prepared.incoming)}\n\nThis device: ${describeSummary(prepared.local)}\n\nCurrent progress will be replaced after active sessions finish. A copy will be saved on this device. Downloaded decks and preferences stay.`;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.canvas, flex: 1 },
    content: {
      gap: sizes.spacing.section,
      padding: sizes.spacing.content,
      paddingTop: screenLayout.contentTopGap,
    },
    description: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
    },
    error: { color: colors.error, fontSize: fontSize.body },
  });
}
