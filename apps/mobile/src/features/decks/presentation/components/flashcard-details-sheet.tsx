import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type FlashcardDetailsSheetProps = Readonly<{
  audioSource: AudioReference;
  card: Flashcard | null;
  onClose: () => void;
}>;

export function FlashcardDetailsSheet({ audioSource, card, onClose }: FlashcardDetailsSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <AppBottomSheet onClose={onClose} size="half" visible={card !== null}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {card ? `#${card.order + 1}` : ""}
          </Text>
          <Pressable
            accessibilityLabel="Close card details"
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
            <FlashcardText style={styles.question} text={card.question} />
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
      color: colors.textSecondary,
      flex: 1,
      fontSize: fontSize.bodyLarge,
      lineHeight: lineHeight.bodyLarge,
    },
    answerRow: { alignItems: "flex-start", flexDirection: "row", gap: sizes.spacing.section },
    content: {
      gap: sizes.spacing.section,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.small,
    },
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
    question: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.title3,
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      flex: 1,
    },
    scrollView: { flex: 1 },
    title: { color: colors.textPrimary, fontSize: fontSize.title2, fontWeight: fontWeight.heavy },
  });
}
