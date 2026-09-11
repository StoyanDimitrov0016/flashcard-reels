import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { useDeckAppearances } from "@/features/decks/presentation/hooks/use-deck-appearances";
import { useLearnerProgress } from "@/features/learner-profile/presentation/hooks/use-learner-progress";
import { ResetProgressSheet } from "@/features/learner-profile/presentation/components/reset-progress-sheet";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

export default function ProgressScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { loading, refresh, resetAllProgress, resetDeckProgress, rows } = useLearnerProgress();
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState<Readonly<{
    reset: () => Promise<void>;
    scope: string;
  }> | null>(null);
  const decks = [...new Map(rows.map((row) => [row.deck.id, row.deck] as const)).values()];
  const { appearances } = useDeckAppearances(decks.map((deck) => deck.id));
  const reviewedCount = rows.filter((row) => row.explanation.reviewCount > 0).length;

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const requestReset = (scope: string, reset: () => Promise<void>): void => {
    if (resetting) {
      return;
    }
    setResetError(null);
    setPendingReset({ reset, scope });
  };

  const confirmReset = () => {
    const request = pendingReset;
    if (!request || resetting) {
      return;
    }
    setResetting(true);
    setResetError(null);
    void request
      .reset()
      .then(() => {
        refresh();
        setPendingReset(null);
      })
      .catch(() =>
        setResetError("The reset could not be completed. Your progress was not changed.")
      )
      .finally(() => setResetting(false));
  };

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Progress
        </Text>
        <Pressable
          accessibilityLabel="Reset all progress"
          accessibilityRole="button"
          disabled={resetting}
          hitSlop={8}
          onPress={() => requestReset("all learning progress", resetAllProgress)}
        >
          <SymbolView
            name={{ android: "restart_alt", ios: "arrow.counterclockwise", web: "restart_alt" }}
            size={sizes.icon.medium}
            tintColor={colors.danger}
          />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={renderRefreshControl(loading && rows.length > 0, refresh, colors)}
      >
        {loading && rows.length === 0 ? (
          <LoadingState fill={false} />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <SummaryFact icon="cards" label="Cards" value={rows.length} />
              <SummaryFact icon="reviewed" label="Reviewed" value={reviewedCount} />
              <SummaryFact icon="new" label="New" value={rows.length - reviewedCount} />
            </View>
            <View style={styles.deckList}>
              {decks.map((deck) => {
                const deckRows = rows.filter((row) => row.deck.id === deck.id);
                const reviewed = deckRows.filter((row) => row.explanation.reviewCount > 0).length;
                const percentage = deckRows.length
                  ? Math.round((reviewed / deckRows.length) * 100)
                  : 0;
                const accent = appearances.get(deck.id)?.accentColor ?? colors.actionPrimary;
                return (
                  <View key={deck.id} style={styles.deckCard}>
                    <View style={[styles.deckAccent, { backgroundColor: accent }]} />
                    <Pressable
                      accessibilityHint="Opens the cards in this deck"
                      accessibilityLabel={`View ${deck.title} cards and progress`}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: "/decks/[deckId]",
                          params: { deckId: deck.id },
                        })
                      }
                      style={({ pressed }) => [styles.deckLink, pressed && styles.pressed]}
                    >
                      <DeckCover accentColor={accent} asset={deck.coverAsset} />
                      <View style={styles.deckCopy}>
                        <View style={styles.deckHeading}>
                          <Text numberOfLines={1} style={styles.deckTitle}>
                            {deck.title}
                          </Text>
                          <Text style={styles.percentage}>{percentage}%</Text>
                        </View>
                        <Text style={styles.reviewed}>
                          {reviewed} / {deckRows.length} reviewed
                        </Text>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { backgroundColor: accent, width: `${percentage}%` },
                            ]}
                          />
                        </View>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Reset ${deck.title} progress`}
                      disabled={resetting}
                      hitSlop={8}
                      onPress={() =>
                        requestReset(`${deck.title} progress`, () => resetDeckProgress(deck.id))
                      }
                    >
                      <SymbolView
                        name={{
                          android: "restart_alt",
                          ios: "arrow.counterclockwise",
                          web: "restart_alt",
                        }}
                        size={sizes.icon.small}
                        tintColor={colors.danger}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
      <ResetProgressSheet
        busy={resetting}
        error={resetError}
        isPresented={pendingReset !== null}
        onCancel={() => {
          if (!resetting) {
            setPendingReset(null);
          }
        }}
        onConfirm={confirmReset}
        scope={pendingReset?.scope ?? "progress"}
      />
    </SafeAreaView>
  );
}

function renderRefreshControl(refreshing: boolean, onRefresh: () => void, colors: AppColors) {
  return (
    <RefreshControl
      colors={[colors.actionPrimary]}
      onRefresh={onRefresh}
      progressBackgroundColor={colors.surfaceRaised}
      refreshing={refreshing}
      tintColor={colors.actionPrimary}
    />
  );
}

type SummaryFactProps = Readonly<{
  icon: "cards" | "new" | "reviewed";
  label: string;
  value: number;
}>;

function SummaryFact({ icon, label, value }: SummaryFactProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const summaryColors = { cards: colors.actionPrimary, new: colors.warning, reviewed: colors.success };
  const symbols = {
    cards: { android: "library_books", ios: "books.vertical.fill", web: "library_books" },
    new: { android: "auto_awesome", ios: "sparkles", web: "auto_awesome" },
    reviewed: { android: "check_box", ios: "checkmark.square.fill", web: "check_box" },
  } as const;

  return (
    <View style={styles.summaryFact}>
      <SymbolView name={symbols[icon]} size={sizes.icon.medium} tintColor={summaryColors[icon]} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  content: { gap: sizes.spacing.section, padding: sizes.spacing.content },
  deckAccent: { alignSelf: "stretch", width: 4 },
  deckCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: sizes.radius.row,
    borderWidth: sizes.border,
    flexDirection: "row",
    gap: sizes.spacing.xLarge,
    minHeight: 82,
    overflow: "hidden",
    paddingRight: sizes.spacing.medium,
  },
  deckCopy: { flex: 1, gap: sizes.spacing.xSmall },
  deckHeading: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.small },
  deckList: { gap: sizes.spacing.medium },
  deckLink: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: sizes.spacing.xLarge,
    minHeight: 80,
  },
  deckTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  headingRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: sizes.border,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: sizes.spacing.content,
  },
  percentage: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
  },
  pressed: { opacity: 0.72 },
  progressFill: { borderRadius: sizes.radius.pill, height: "100%" },
  progressTrack: {
    backgroundColor: colors.borderStrong,
    borderRadius: sizes.radius.pill,
    height: 5,
    overflow: "hidden",
  },
  reviewed: { color: colors.textMuted, fontSize: fontSize.caption },
  screen: { backgroundColor: colors.background, flex: 1 },
  summaryFact: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: sizes.radius.row,
    borderWidth: sizes.border,
    flex: 1,
    gap: sizes.spacing.xSmall,
    padding: sizes.spacing.xLarge,
  },
  summaryLabel: { color: colors.textMuted, fontSize: fontSize.caption },
  summaryRow: { flexDirection: "row", gap: sizes.spacing.medium },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: fontSize.title2,
    fontWeight: fontWeight.heavy,
  },
  title: { color: colors.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy }
  });
}