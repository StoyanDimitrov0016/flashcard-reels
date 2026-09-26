import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { StyleSheet, Text, View } from "react-native";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { explainFlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress-explanation";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type DeckInfoSheetProps = Readonly<{
  cards: readonly Flashcard[];
  deck: Deck | null;
  onClose: () => void;
  progress: ReadonlyMap<string, FlashcardProgress>;
  visible: boolean;
}>;

export function DeckInfoSheet({ cards, deck, onClose, progress, visible }: DeckInfoSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const reviewedProgress = cards.flatMap((card) => {
    const flashcardProgress = progress.get(card.id);
    return flashcardProgress && flashcardProgress.reviewCount > 0 ? [flashcardProgress] : [];
  });
  const totalReviews = reviewedProgress.reduce(
    (total, flashcardProgress) => total + flashcardProgress.reviewCount,
    0
  );
  const recallScores = reviewedProgress.flatMap((flashcardProgress) => {
    const score = explainFlashcardProgress(flashcardProgress).averageRecallScore;
    return score === null ? [] : [score];
  });
  const averageRecall =
    recallScores.length === 0
      ? null
      : Math.round(
          (recallScores.reduce((total, score) => total + score, 0) / recallScores.length / 3) * 100
        );

  return (
    <AppBottomSheet onClose={onClose} visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <SheetHeader
          closeLabel="Close deck information"
          onClose={onClose}
          title={deck?.title ?? "Deck information"}
        />
        <BottomSheetScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
          {!!deck && <Text style={styles.description}>{deck.description}</Text>}
          <View style={styles.metrics}>
            <Metric label="Cards" value={String(cards.length)} />
            <Metric label="New" value={String(cards.length - reviewedProgress.length)} />
            <Metric label="Reviews" value={String(totalReviews)} />
            <Metric label="Recall" value={averageRecall === null ? "–" : `${averageRecall}%`} />
          </View>
        </BottomSheetScrollView>
      </View>
    </AppBottomSheet>
  );
}

type MetricProps = Readonly<{ label: string; value: string }>;

function Metric({ label, value }: MetricProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      gap: sizes.spacing.section,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
    },
    description: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
    },
    metric: { alignItems: "center", flex: 1, gap: sizes.spacing.xSmall },
    metricLabel: { color: colors.textTertiary, fontSize: fontSize.caption },
    metrics: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: sizes.radius.row,
      flexDirection: "row",
      paddingVertical: sizes.spacing.xLarge,
    },
    metricValue: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontVariant: ["tabular-nums"],
      fontWeight: fontWeight.heavy,
    },
    scrollView: { flexShrink: 1 },
    sheet: { flexShrink: 1 },
  });
}
