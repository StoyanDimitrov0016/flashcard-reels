import { SymbolView } from "expo-symbols";
import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";

type FlashcardDetailsSheetProps = Readonly<{
  audioSource: AudioReference;
  card: Flashcard | null;
  onClose: () => void;
}>;

export function FlashcardDetailsSheet({ audioSource, card, onClose }: FlashcardDetailsSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { height } = useWindowDimensions();

  return (
    <AppBottomSheet contentHeight={height * 0.5} onClose={onClose} visible={card !== null}>
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
        {card ? (
          <BottomSheetScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
            <Text style={styles.question}>{card.question}</Text>
            <View style={styles.answerRow}>
              <Text style={styles.answer}>{card.answer}</Text>
              {audioSource ? <AnswerAudioPlayer isActive source={audioSource} /> : null}
            </View>
          </BottomSheetScrollView>
        ) : null}
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
    iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
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
