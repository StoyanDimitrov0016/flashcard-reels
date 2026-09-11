import { SymbolView } from "expo-symbols";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
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
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={card !== null}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Close card details" onPress={onClose} style={styles.scrim} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Card {card ? card.order + 1 : ""}
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
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.question}>{card.question}</Text>
              <View style={styles.answerRow}>
                <Text style={styles.answer}>{card.answer}</Text>
                {audioSource ? <AnswerAudioPlayer isActive source={audioSource} /> : null}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
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
      padding: sizes.spacing.content,
      paddingBottom: sizes.spacing.spacious,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      padding: sizes.spacing.content,
    },
    iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
    question: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.title3,
    },
    root: { flex: 1, justifyContent: "flex-end" },
    scrim: {
      backgroundColor: colors.overlay,
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      borderWidth: sizes.border,
      maxHeight: "82%",
    },
    title: { color: colors.textPrimary, fontSize: fontSize.title2, fontWeight: fontWeight.heavy },
  });
}
