import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import { explainFlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress-explanation";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

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
      : Math.round((explanation.averageRecallScore / 3) * 100);

  return (
    <AppBottomSheet onClose={onClose} size="half" visible={card !== null}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {card ? `#${card.order + 1}` : ""}
          </Text>
          <Pressable
            accessibilityLabel="Close card progress"
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
        {!!card && (
          <BottomSheetScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
            <Text style={styles.question}>{card.question}</Text>
            <View style={styles.answerRow}>
              <Text style={styles.answer}>{card.answer}</Text>
              {!!audioSource && <AnswerAudioPlayer isActive source={audioSource} />}
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
      color: colors.textSecondary,
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
      paddingTop: sizes.spacing.small,
    },
    fact: { alignItems: "center", flex: 1, gap: sizes.spacing.xSmall },
    fill: { borderRadius: sizes.radius.pill, height: "100%" },
    header: {
      alignItems: "center",
      flexDirection: "row",
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
    progressHeading: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    question: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.title3,
    },
    ratings: { flexDirection: "row" },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      flex: 1,
    },
    scrollView: { flex: 1 },
    status: { fontSize: fontSize.caption, fontWeight: fontWeight.bold },
    title: { color: colors.textPrimary, fontSize: fontSize.title2, fontWeight: fontWeight.heavy },
    track: {
      backgroundColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      height: 5,
      overflow: "hidden",
    },
    value: { fontSize: fontSize.body, fontWeight: fontWeight.heavy },
  });
}
