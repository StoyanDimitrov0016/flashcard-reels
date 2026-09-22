import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ArchivedDeckProgress } from "@/features/decks/domain/archived-deck-progress";

import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { DestructiveConfirmationSheet } from "@/shared/presentation/components/destructive-confirmation-sheet";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

export default function ArchivedProgressScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { deckService } = useDecks();
  const [rows, setRows] = useState<ArchivedDeckProgress[]>([]);
  const [selected, setSelected] = useState<ArchivedDeckProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void deckService
      .listArchivedProgress()
      .then(setRows)
      .catch(() => setError("Could not load archived progress."));
  }, [deckService]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const deleteSelected = async () => {
    if (!selected || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deckService.deleteProgress(selected.deckId);
      setSelected(null);
      refresh();
    } catch {
      setError("Could not delete saved progress. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScreenHeader>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Archived progress
        </Text>
      </ScreenHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Learning progress saved for decks removed from this device. Sizes are approximate and
          exclude deck cards and audio.
        </Text>
        {error && !selected && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        {rows.length === 0 && <Text style={styles.empty}>No archived progress yet.</Text>}
        {rows.map((row) => (
          <View key={row.deckId} style={styles.card}>
            <Text style={styles.deckTitle}>{row.title}</Text>
            <Text style={styles.detail}>
              {row.reviewCount} reviews · {row.reviewedCardCount} cards reviewed
            </Text>
            <Text style={styles.detail}>
              Last studied {new Date(row.lastReviewedAt).toLocaleDateString()} · About{" "}
              {formatBytes(row.estimatedBytes)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError(null);
                setSelected(row);
              }}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>Delete saved progress</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <DestructiveConfirmationSheet
        actionLabel="Delete saved progress"
        busy={busy}
        error={error}
        icon={{ android: "delete", ios: "trash.fill", web: "delete" }}
        message="All saved reviews and learning progress for this deck will be permanently deleted."
        onCancel={() => {
          if (!busy) {
            setSelected(null);
          }
        }}
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
    back: { justifyContent: "center", minWidth: 48 },
    link: { color: colors.actionPrimary, fontSize: fontSize.body },
    title: { color: colors.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy },
    content: {
      gap: sizes.spacing.section,
      padding: sizes.spacing.content,
      paddingTop: screenLayout.contentTopGap,
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
      alignSelf: "flex-start",
      minHeight: sizes.touchTarget.minimum,
      justifyContent: "center",
    },
    deleteText: { color: colors.error, fontSize: fontSize.body },
    empty: { color: colors.textTertiary, fontSize: fontSize.body },
    error: { color: colors.error, fontSize: fontSize.caption },
  });
}
