import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { explainFlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress-explanation";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
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
    <AppBottomSheet onClose={onClose} size="half" visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {deck?.title ?? "Deck information"}
          </Text>
          <Pressable
            accessibilityLabel="Close deck information"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.iconButton}
          >
            <SymbolView
              name={{ android: "close", ios: "xmark", web: "close" }}
              size={sizes.icon.medium}
              tintColor={colors.textPrimary}
            />
          </Pressable>
        </View>
        <BottomSheetScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
          <View style={styles.metrics}>
            <Metric label="Cards" value={cards.length} />
            <Metric label="Reviewed" value={reviewedProgress.length} />
            <Metric label="New" value={cards.length - reviewedProgress.length} />
            <Metric label="Reviews" value={totalReviews} />
          </View>
          <Text style={styles.recall}>
            {averageRecall === null ? "No recall data yet" : `${averageRecall}% average recall`}
          </Text>
          {!!deck && <Text style={styles.description}>{deck.description}</Text>}
        </BottomSheetScrollView>
      </View>
    </AppBottomSheet>
  );
}

type MetricProps = Readonly<{ label: string; value: number }>;

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
      paddingTop: sizes.spacing.small,
    },
    description: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      justifyContent: "space-between",
      paddingBottom: sizes.spacing.small,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: 0,
    },
    iconButton: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
    },
    metric: { alignItems: "center", flex: 1, gap: sizes.spacing.xSmall },
    metricLabel: { color: colors.textTertiary, fontSize: fontSize.caption },
    metrics: { flexDirection: "row" },
    metricValue: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.heavy,
    },
    recall: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.bold },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      flex: 1,
    },
    scrollView: { flex: 1 },
    title: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.heavy,
    },
  });
}
