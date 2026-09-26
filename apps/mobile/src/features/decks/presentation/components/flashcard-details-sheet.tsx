import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { StyleSheet, View } from "react-native";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, lineHeight, textStyles } from "@/shared/presentation/typography";

type FlashcardDetailsSheetProps = Readonly<{
  audioSource: AudioReference;
  card: Flashcard | null;
  onClose: () => void;
}>;

export function FlashcardDetailsSheet({ audioSource, card, onClose }: FlashcardDetailsSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <AppBottomSheet onClose={onClose} visible={card !== null}>
      <View accessibilityViewIsModal style={styles.sheet}>
        {!!card && (
          <SheetHeader
            closeLabel="Close card details"
            onClose={onClose}
            title={<FlashcardText style={styles.question} text={card.question} />}
          />
        )}
        {!!card && (
          <BottomSheetScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
            <View style={styles.answerRow}>
              <FlashcardText style={styles.answer} text={card.answer} />
              {!!audioSource && <AnswerAudioPlayer isActive source={audioSource} />}
            </View>
          </BottomSheetScrollView>
        )}
      </View>
    </AppBottomSheet>
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
    content: {
      gap: sizes.spacing.section,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
    },
    question: { color: colors.textPrimary, ...textStyles.sheetTitle },
    scrollView: { flexShrink: 1 },
    sheet: { flexShrink: 1 },
  });
}
