import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useArchivedProgress } from "@/features/decks/presentation/controllers/use-archived-progress";
import { DestructiveConfirmationSheet } from "@/shared/presentation/components/destructive-confirmation-sheet";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { ScreenBackButton } from "@/shared/presentation/components/screen-back-button";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

export default function ArchivedProgressScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const {
    rows,
    selected,
    loading,
    deleting,
    loadError,
    deleteError,
    refresh,
    chooseForDeletion,
    cancelDeletion,
    deleteSelected,
  } = useArchivedProgress();

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScreenHeader>
        <ScreenBackButton accessibilityLabel="Back to Controls" onPress={() => router.back()} />
        <Text accessibilityRole="header" style={styles.title}>
          Archived progress
        </Text>
      </ScreenHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Learning progress saved for decks removed from this device. Sizes are approximate and
          exclude deck cards and audio.
        </Text>
        {loading && rows.length === 0 && (
          <LoadingState accessibilityLabel="Loading archived progress" fill={false} />
        )}
        {loadError && (
          <View style={styles.loadError}>
            <Text accessibilityRole="alert" style={styles.error}>
              {loadError}
            </Text>
            <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
        {!loading && !loadError && rows.length === 0 && (
          <Text style={styles.empty}>No archived progress yet.</Text>
        )}
        {rows.map((row) => (
          <View key={row.deckId} style={styles.card}>
            <Text style={styles.deckTitle}>{row.title}</Text>
            <Text style={styles.detail}>
              {row.reviewCount} {row.reviewCount === 1 ? "review" : "reviews"} ·{" "}
              {row.reviewedCardCount} {row.reviewedCardCount === 1 ? "card" : "cards"} reviewed
            </Text>
            <Text style={styles.detail}>
              Last studied {new Date(row.lastReviewedAt).toLocaleDateString()} · About{" "}
              {formatBytes(row.estimatedBytes)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => chooseForDeletion(row)}
              style={styles.deleteButton}
            >
              <SymbolView
                name={{ android: "delete", ios: "trash", web: "delete" }}
                size={sizes.icon.small}
                tintColor={colors.error}
              />
              <Text style={styles.deleteText}>Delete saved progress</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <DestructiveConfirmationSheet
        actionLabel="Delete saved progress"
        busy={deleting}
        error={deleteError}
        icon={{ android: "delete", ios: "trash.fill", web: "delete" }}
        message="All saved reviews and learning progress for this deck will be permanently deleted."
        onCancel={cancelDeletion}
        onConfirm={() => void deleteSelected()}
        title={`Delete ${selected?.title ?? "deck"} progress?`}
        visible={selected !== null}
      />
    </SafeAreaView>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${Math.max(0, Math.round(bytes))} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.canvas, flex: 1 },
    title: { color: colors.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy },
    content: {
      gap: sizes.spacing.section,
      padding: sizes.spacing.content,
      paddingTop: screenLayout.contentTopGap,
      paddingBottom: sizes.spacing.spacious,
    },
    description: { color: colors.textSecondary, fontSize: fontSize.body },
    card: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      gap: sizes.spacing.small,
      padding: sizes.spacing.section,
    },
    deckTitle: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.bold },
    detail: { color: colors.textSecondary, fontSize: fontSize.caption },
    deleteButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      flexDirection: "row",
      gap: sizes.spacing.small,
      minHeight: sizes.touchTarget.minimum,
      justifyContent: "center",
    },
    deleteText: { color: colors.error, fontSize: fontSize.body },
    empty: { color: colors.textTertiary, fontSize: fontSize.body },
    error: { color: colors.error, fontSize: fontSize.body },
    loadError: { alignItems: "flex-start", gap: sizes.spacing.small },
    retryButton: { justifyContent: "center", minHeight: sizes.touchTarget.minimum },
    retryText: {
      color: colors.actionPrimary,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
  });
}
