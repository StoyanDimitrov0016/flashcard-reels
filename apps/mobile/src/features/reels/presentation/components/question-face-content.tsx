import { Pressable, StyleSheet, Text, View } from "react-native";

import { toSpokenFlashcardText } from "@/features/flashcards/domain/flashcard-text";
import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

type QuestionFaceContentProps = Readonly<{
  cardQuestion: string;
  instructionColor: string;
  onLongPress: () => void;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  longPressDuration: number;
  questionColor: string;
}>;

export function QuestionFaceContent({
  cardQuestion,
  instructionColor,
  onLongPress,
  onPress,
  onPressIn,
  onPressOut,
  longPressDuration,
  questionColor,
}: QuestionFaceContentProps) {
  const styles = createStyles(questionColor, instructionColor);

  return (
    <Pressable
      accessibilityHint="Double tap to reveal the answer"
      accessibilityLabel={"Flashcard question: " + toSpokenFlashcardText(cardQuestion)}
      accessibilityRole="button"
      delayLongPress={longPressDuration}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.content}
    >
      <View style={styles.copy}>
        <FlashcardText style={styles.prompt} text={cardQuestion} />
        <Text style={styles.revealInstruction}>Double tap to reveal the answer</Text>
      </View>
    </Pressable>
  );
}

function createStyles(questionColor: string, instructionColor: string) {
  return StyleSheet.create({
    content: {
      flex: 1,
      justifyContent: "center",
      paddingVertical: sizes.spacing.screen,
    },
    copy: { gap: 22 },
    prompt: {
      color: questionColor,
      fontSize: fontSize.hero,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.tightest,
      lineHeight: lineHeight.hero,
    },
    revealInstruction: {
      color: instructionColor,
      fontSize: fontSize.callout,
      lineHeight: lineHeight.subhead,
    },
  });
}
