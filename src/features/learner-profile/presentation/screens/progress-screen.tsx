import { useState } from "react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { useDeckAppearances } from "@/features/decks/presentation/hooks/use-deck-appearances";
import { useLearnerProgress } from "@/features/learner-profile/presentation/hooks/use-learner-progress";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

export default function ProgressScreen() {
  const router = useRouter();
  const { loading, refresh, resetAllProgress, resetDeckProgress, rows } = useLearnerProgress();
  const [resetting, setResetting] = useState(false);
  const decks = [...new Map(rows.map((row) => [row.deck.id, row.deck] as const)).values()];
  const { appearances } = useDeckAppearances(decks.map((deck) => deck.id));
  const reviewedCount = rows.filter((row) => row.explanation.reviewCount > 0).length;

  const requestReset = (scope: string, reset: () => Promise<void>): void => {
    if (resetting) {
      return;
    }
    Alert.alert(
      `Reset ${scope}?`,
      "Learning progress will be reset, but cards and decks will not be deleted.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => {
            setResetting(true);
            void reset()
              .then(refresh)
              .catch(() => Alert.alert("Reset failed", "Your learning progress was not changed."))
              .finally(() => setResetting(false));
          },
          style: "destructive",
          text: "Reset",
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <Text accessibilityRole="header" style={styles.title}>
            Progress
          </Text>
          <SymbolView
            name={{ android: "insights", ios: "chart.bar.xaxis", web: "insights" }}
            size={sizes.icon.medium}
            tintColor={palette.textMuted}
          />
        </View>
        {loading ? (
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
                const accent = appearances.get(deck.id)?.accentColor ?? palette.actionPrimary;
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
                      <SymbolView
                        name={{
                          android: "chevron_right",
                          ios: "chevron.right",
                          web: "chevron_right",
                        }}
                        size={sizes.icon.small}
                        tintColor={palette.textMuted}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Reset ${deck.title} progress`}
                      disabled={resetting}
                      hitSlop={8}
                      onPress={() =>
                        requestReset(`${deck.title} progress`, () => resetDeckProgress(deck.id))
                      }
                      style={styles.moreButton}
                    >
                      <SymbolView
                        name={{
                          android: "restart_alt",
                          ios: "arrow.counterclockwise",
                          web: "restart_alt",
                        }}
                        size={sizes.icon.small}
                        tintColor={palette.textMuted}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <View style={styles.actions}>
              <ActionButton
                label="Reset all progress"
                onPress={() => requestReset("all learning progress", resetAllProgress)}
              />
              <ActionButton label="Refresh progress" onPress={refresh} primary />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type SummaryFactProps = Readonly<{
  icon: "cards" | "new" | "reviewed";
  label: string;
  value: number;
}>;

function SummaryFact({ icon, label, value }: SummaryFactProps) {
  const colors = { cards: palette.actionPrimary, new: palette.warning, reviewed: palette.success };
  const symbols = {
    cards: { android: "library_books", ios: "books.vertical.fill", web: "library_books" },
    new: { android: "auto_awesome", ios: "sparkles", web: "auto_awesome" },
    reviewed: { android: "check_box", ios: "checkmark.square.fill", web: "check_box" },
  } as const;

  return (
    <View style={styles.summaryFact}>
      <SymbolView name={symbols[icon]} size={sizes.icon.medium} tintColor={colors[icon]} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

type ActionButtonProps = Readonly<{ label: string; onPress: () => void; primary?: boolean }>;

function ActionButton({ label, onPress, primary = false }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionButton, primary && styles.primaryAction]}
    >
      <Text style={[styles.actionLabel, primary && styles.primaryActionLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderColor: palette.actionPrimary,
    borderRadius: sizes.radius.pill,
    borderWidth: sizes.border,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: sizes.spacing.medium,
  },
  actionLabel: {
    color: palette.actionPrimary,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
  },
  actions: { flexDirection: "row", gap: sizes.spacing.medium },
  content: { gap: sizes.spacing.section, padding: sizes.spacing.content },
  deckAccent: { alignSelf: "stretch", width: 4 },
  deckCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.border,
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
    color: palette.textPrimary,
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  headingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  moreButton: { alignItems: "center", height: 36, justifyContent: "center", width: 32 },
  percentage: {
    color: palette.textSecondary,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
  },
  primaryAction: { backgroundColor: palette.actionPrimary },
  primaryActionLabel: { color: palette.actionPrimaryText },
  pressed: { opacity: 0.72 },
  progressFill: { borderRadius: sizes.radius.pill, height: "100%" },
  progressTrack: {
    backgroundColor: palette.borderStrong,
    borderRadius: sizes.radius.pill,
    height: 5,
    overflow: "hidden",
  },
  reviewed: { color: palette.textMuted, fontSize: fontSize.caption },
  screen: { backgroundColor: palette.background, flex: 1 },
  summaryFact: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: sizes.radius.row,
    borderWidth: sizes.border,
    flex: 1,
    gap: sizes.spacing.xSmall,
    padding: sizes.spacing.xLarge,
  },
  summaryLabel: { color: palette.textMuted, fontSize: fontSize.caption },
  summaryRow: { flexDirection: "row", gap: sizes.spacing.medium },
  summaryValue: {
    color: palette.textPrimary,
    fontSize: fontSize.title2,
    fontWeight: fontWeight.heavy,
  },
  title: { color: palette.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy },
});
