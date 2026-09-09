import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLearnerProgress } from "@/features/learner-profile/presentation/hooks/use-learner-progress";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

export default function ProgressScreen() {
  const { loading, refresh, resetAllProgress, resetCardProgress, resetDeckProgress, rows } =
    useLearnerProgress();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const deckFilters = [...new Map(rows.map((row) => [row.deck.id, row.deck] as const)).values()];
  const visibleRows = selectedDeckId ? rows.filter((row) => row.deck.id === selectedDeckId) : rows;
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
              .then(() => refresh())
              .catch(() => {
                Alert.alert("Reset failed", "Your learning progress was not changed.");
              })
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
        {loading ? (
          <LoadingState fill={false} />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <SummaryFact label="Cards" value={rows.length} />
              <SummaryFact label="Reviewed" value={reviewedCount} />
              <SummaryFact label="New" value={rows.length - reviewedCount} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              <FilterButton
                label="All decks"
                selected={selectedDeckId === null}
                onPress={() => setSelectedDeckId(null)}
              />
              {deckFilters.map((deck) => (
                <FilterButton
                  key={deck.id}
                  label={deck.title}
                  selected={selectedDeckId === deck.id}
                  onPress={() => setSelectedDeckId(deck.id)}
                />
              ))}
            </ScrollView>
            <View style={styles.resetActions}>
              {selectedDeckId && (
                <ResetButton
                  disabled={resetting}
                  label="Reset selected deck"
                  onPress={() => requestReset("this deck", () => resetDeckProgress(selectedDeckId))}
                />
              )}
              <ResetButton
                disabled={resetting}
                label="Reset all progress"
                onPress={() => requestReset("all learning progress", resetAllProgress)}
              />
            </View>
            <View style={styles.list}>
              {visibleRows.map((row) => (
                <ProgressRow
                  key={row.card.id}
                  resetting={resetting}
                  onReset={() => requestReset("this card", () => resetCardProgress(row.card.id))}
                  row={row}
                />
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={refresh} style={styles.refreshButton}>
              <Text style={styles.refreshLabel}>Refresh progress</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type SummaryFactProps = Readonly<{ label: string; value: number }>;

function SummaryFact({ label, value }: SummaryFactProps) {
  return (
    <View style={styles.summaryFact}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

type FilterButtonProps = Readonly<{ label: string; onPress: () => void; selected: boolean }>;

function FilterButton({ label, onPress, selected }: FilterButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.filter, selected && styles.selectedFilter]}>
      <Text style={[styles.filterLabel, selected && styles.selectedFilterLabel]}>{label}</Text>
    </Pressable>
  );
}

type ResetButtonProps = Readonly<{
  disabled?: boolean;
  label: string;
  onPress: () => void;
}>;

function ResetButton({ disabled = false, label, onPress }: ResetButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.resetButton, disabled && styles.disabledButton]}
    >
      <Text style={styles.resetLabel}>{disabled ? "Resetting…" : label}</Text>
    </Pressable>
  );
}

type ProgressRowProps = Readonly<{
  onReset: () => void;
  resetting: boolean;
  row: ReturnType<typeof useLearnerProgress>["rows"][number];
}>;

function ProgressRow({ onReset, resetting, row }: ProgressRowProps) {
  const { card, deck, explanation, profile } = row;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardQuestion}>{card.question}</Text>
        <Text style={styles.priority}>{explanation.priority}</Text>
      </View>
      <Text style={styles.deck}>{deck.title}</Text>
      <Text style={styles.counts}>
        Reviews {explanation.reviewCount} · Again {profile?.againCount ?? 0} · Hard{" "}
        {profile?.hardCount ?? 0} · Good {profile?.goodCount ?? 0} · Easy {profile?.easyCount ?? 0}
      </Text>
      <Text style={styles.lastReviewed}>
        {profile?.lastReviewedAt
          ? `Last reviewed ${formatDate(profile.lastReviewedAt)}`
          : "Not reviewed yet"}
      </Text>
      <Text style={styles.reason}>{explanation.reason}</Text>
      <ResetButton disabled={resetting} label="Reset card progress" onPress={onReset} />
    </View>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background, flex: 1 },
  content: { gap: sizes.spacing.section, padding: sizes.spacing.content },
  summaryRow: { flexDirection: "row", gap: sizes.spacing.small },
  summaryFact: {
    backgroundColor: palette.surface,
    borderRadius: sizes.radius.medium,
    flex: 1,
    padding: sizes.spacing.content,
  },
  summaryValue: {
    color: palette.textPrimary,
    fontSize: fontSize.title1,
    fontWeight: fontWeight.heavy,
  },
  summaryLabel: {
    color: palette.textMuted,
    fontSize: fontSize.caption,
    marginTop: sizes.spacing.xSmall,
  },
  filters: { gap: sizes.spacing.small },
  filter: {
    borderColor: palette.border,
    borderRadius: sizes.radius.pill,
    borderWidth: sizes.border,
    paddingHorizontal: sizes.spacing.content,
    paddingVertical: sizes.spacing.small,
  },
  selectedFilter: {
    backgroundColor: palette.controlSelected,
    borderColor: palette.controlSelected,
  },
  filterLabel: { color: palette.textMuted, fontSize: fontSize.footnote },
  selectedFilterLabel: { color: palette.textPrimary, fontWeight: fontWeight.bold },
  list: { gap: sizes.spacing.small },
  resetActions: { gap: sizes.spacing.small },
  resetButton: { alignSelf: "flex-start", paddingVertical: sizes.spacing.xSmall },
  disabledButton: { opacity: 0.5 },
  resetLabel: { color: palette.danger, fontSize: fontSize.caption, fontWeight: fontWeight.bold },
  card: {
    backgroundColor: palette.surface,
    borderRadius: sizes.radius.card,
    gap: sizes.spacing.small,
    padding: sizes.spacing.content,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: sizes.spacing.small,
    justifyContent: "space-between",
  },
  cardQuestion: {
    color: palette.textPrimary,
    flex: 1,
    fontSize: fontSize.title3,
    fontWeight: fontWeight.bold,
  },
  priority: {
    color: palette.actionPrimary,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.heavy,
    textTransform: "uppercase",
  },
  deck: { color: palette.textSecondary, fontSize: fontSize.footnote },
  counts: { color: palette.textPrimary, fontSize: fontSize.footnote, lineHeight: lineHeight.body },
  lastReviewed: { color: palette.textMuted, fontSize: fontSize.caption },
  reason: {
    color: palette.textMuted,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.footnote,
  },
  refreshButton: { alignItems: "center", padding: sizes.spacing.content },
  refreshLabel: { color: palette.actionPrimary, fontWeight: fontWeight.bold },
});
