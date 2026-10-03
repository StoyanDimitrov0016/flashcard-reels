import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { StyleSheet, Text, View } from "react-native";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { FlashcardAudioPlayer } from "@/features/audio/presentation/components/flashcard-audio-player";
import {
  explainFlashcardProgress,
  toRecallPercentage,
} from "@/features/flashcard-progress/domain/flashcard-progress-explanation";
import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight, textStyles } from "@/shared/presentation/typography";

type FlashcardProgressSheetProps = Readonly<{
  accentColor: string;
  audioSource: AudioReference;
  card: Flashcard | null;
  onClose: () => void;
  progress: FlashcardProgress | null;
}>;

export function FlashcardProgressSheet({
  accentColor,
  audioSource,
  card,
  onClose,
  progress,
}: FlashcardProgressSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const explanation = explainFlashcardProgress(progress);
  const reviewed = (progress?.reviewCount ?? 0) > 0;
  const recallPercentage =
    explanation.averageRecallScore === null
      ? 0
      : toRecallPercentage(explanation.averageRecallScore);

  return (
    <AppBottomSheet onClose={onClose} visible={card !== null}>
      <View accessibilityViewIsModal style={styles.sheet}>
        {!!card && (
          <SheetHeader
            closeLabel="Close card progress"
            onClose={onClose}
            title={<FlashcardText style={styles.question} text={card.question} />}
          />
        )}
        {!!card && (
          <BottomSheetScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
            <View style={styles.answerRow}>
              <FlashcardText style={styles.answer} text={card.answer} />
              {!!audioSource && <FlashcardAudioPlayer isActive source={audioSource} />}
            </View>
            <View style={styles.progressHeading}>
              <Text
                style={[styles.status, { color: reviewed ? accentColor : colors.textTertiary }]}
              >
                {reviewed ? `${progress?.reviewCount ?? 0} reviews` : "New"}
              </Text>
              <Text style={styles.caption}>
                {reviewed
                  ? `${recallPercentage}% recall · ${explanation.historyBand}`
                  : "Not reviewed yet"}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: accentColor, width: `${recallPercentage}%` },
                ]}
              />
            </View>
            <View style={styles.ratings}>
              <ProgressFact color={colors.error} label="Again" value={progress?.againCount ?? 0} />
              <ProgressFact color={colors.warning} label="Hard" value={progress?.hardCount ?? 0} />
              <ProgressFact color={colors.success} label="Good" value={progress?.goodCount ?? 0} />
              <ProgressFact
                color={colors.recallEasy}
                label="Easy"
                value={progress?.easyCount ?? 0}
              />
            </View>
            <Text style={styles.caption}>
              {progress?.lastReviewedAt
                ? `Last reviewed ${new Date(progress.lastReviewedAt).toLocaleDateString()}`
                : "No review history"}
            </Text>
          </BottomSheetScrollView>
        )}
      </View>
    </AppBottomSheet>
  );
}

type ProgressFactProps = Readonly<{ color: string; label: string; value: number }>;

function ProgressFact({ color, label, value }: ProgressFactProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.fact}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    answer: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.bodyLarge,
      lineHeight: lineHeight.bodyLarge,
    },
    answerRow: { alignItems: "flex-start", flexDirection: "row", gap: sizes.spacing.section },
    caption: { color: colors.textTertiary, fontSize: fontSize.caption },
    content: {
      gap: sizes.spacing.section,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
    },
    fact: { alignItems: "center", flex: 1, gap: sizes.spacing.xSmall },
    fill: { borderRadius: sizes.radius.pill, height: "100%" },
    progressHeading: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    question: { color: colors.textPrimary, ...textStyles.sheetTitle },
    ratings: { flexDirection: "row" },
    scrollView: { flexShrink: 1 },
    sheet: { flexShrink: 1 },
    status: { fontSize: fontSize.caption, fontWeight: fontWeight.bold },
    track: {
      backgroundColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      height: 5,
      overflow: "hidden",
    },
    value: { fontSize: fontSize.body, fontWeight: fontWeight.heavy },
  });
}
