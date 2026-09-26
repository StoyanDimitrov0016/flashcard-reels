import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PendingDeckProgress } from "@/features/decks/domain/archived-deck-progress";

import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

type SavedProgressChoiceSheetProps = Readonly<{
  busy: boolean;
  error: string | null;
  progress: PendingDeckProgress | null;
  onContinue: () => void;
  onStartFresh: () => void;
  onClose: () => void;
}>;

export function SavedProgressChoiceSheet({
  busy,
  error,
  progress,
  onContinue,
  onStartFresh,
  onClose,
}: SavedProgressChoiceSheetProps) {
  const styles = createStyles(useAppTheme().colors);
  return (
    <AppBottomSheet dismissible={!busy} onClose={onClose} size="medium" visible={progress !== null}>
      <View accessibilityViewIsModal style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Saved learning progress
        </Text>
        <Text style={styles.copy}>
          You studied {progress?.title ?? "this deck"} before. Continue with your saved progress or
          permanently delete it and start fresh.
        </Text>
        {progress?.lastReviewedAt && (
          <Text style={styles.detail}>
            Last studied {new Date(progress.lastReviewedAt).toLocaleDateString()}
          </Text>
        )}
        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onContinue}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>Continue with saved progress</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onStartFresh}
          style={styles.secondary}
        >
          <Text style={styles.deleteText}>Delete progress and start fresh</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onClose}
          style={styles.secondary}
        >
          <Text style={styles.copy}>Decide later</Text>
        </Pressable>
      </View>
    </AppBottomSheet>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: { gap: sizes.spacing.section, padding: sizes.spacing.content },
    title: { color: colors.textPrimary, fontSize: fontSize.title2, fontWeight: fontWeight.bold },
    copy: { color: colors.textSecondary, fontSize: fontSize.body },
    detail: { color: colors.textTertiary, fontSize: fontSize.caption },
    error: { color: colors.error, fontSize: fontSize.caption },
    primary: {
      alignItems: "center",
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.control,
      minHeight: sizes.control.standard,
      justifyContent: "center",
      padding: sizes.spacing.medium,
    },
    primaryText: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    secondary: {
      alignItems: "center",
      minHeight: sizes.control.standard,
      justifyContent: "center",
    },
    deleteText: { color: colors.error, fontSize: fontSize.body, fontWeight: fontWeight.bold },
  });
}
