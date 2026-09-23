import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
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
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

export default function ProgressBackupScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const {
    busy,
    prepared,
    hasSafetyCopy,
    error,
    notice,
    exportProgress,
    pickBackup,
    restore,
    shareSafetyCopy,
    cancelRestore,
  } = useProgressBackupController();

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScreenHeader>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Progress backup
        </Text>
      </ScreenHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Save your learning progress to a file or move it to another device. Backups include
          reviews, schedules, and archived progress. They exclude downloaded decks, audio, and
          preferences. Backup files are readable and are not password protected.
        </Text>
        <PreferenceSection title="Backup and restore">
          <PreferenceRow
            detail="Finishes current study sessions, then shares a progress file"
            icon={{ android: "upload_file", ios: "square.and.arrow.up", web: "upload_file" }}
            onPress={() => void exportProgress()}
            title="Export progress"
          />
          <PreferenceRow
            detail="Preview a file before replacing progress on this device"
            icon={{ android: "download", ios: "square.and.arrow.down", web: "download" }}
            onPress={() => void pickBackup()}
            title="Import progress"
          />
          {hasSafetyCopy && (
            <PreferenceRow
              detail="Saved automatically before the last import"
              icon={{ android: "history", ios: "clock.arrow.circlepath", web: "history" }}
              onPress={() => void shareSafetyCopy()}
              title="Share previous progress backup"
            />
          )}
        </PreferenceSection>
        {busy && !prepared && <Text style={styles.description}>Working on progress backup…</Text>}
        {notice && (
          <Text accessibilityRole="alert" style={styles.description}>
            {notice}
          </Text>
        )}
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
  return `${summary.deckCount} studied decks and ${summary.reviewCount} reviews.${latest}`;
}

function restorePreview(prepared: PreparedProgressRestore): string {
  return `Backup: ${describeSummary(prepared.incoming)}\n\nThis device: ${describeSummary(prepared.local)}\n\nYour current learning progress will be replaced. Downloaded decks and preferences stay. Active study sessions will finish first, and a copy of current progress will be saved on this device.`;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.canvas, flex: 1 },
    back: { justifyContent: "center", minWidth: 48 },
    link: { color: colors.actionPrimary, fontSize: fontSize.body },
    title: { color: colors.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy },
    content: {
      gap: sizes.spacing.section,
      padding: sizes.spacing.content,
      paddingTop: screenLayout.contentTopGap,
    },
    description: { color: colors.textSecondary, fontSize: fontSize.body },
    error: { color: colors.error, fontSize: fontSize.body },
  });
}
