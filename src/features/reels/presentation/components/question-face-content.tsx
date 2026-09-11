import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

type QuestionFaceContentProps = Readonly<{
  cardQuestion: string;
  onLongPress: () => void;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  longPressDuration: number;
}>;

export function QuestionFaceContent({
  cardQuestion,
  onLongPress,
  onPress,
  onPressIn,
  onPressOut,
  longPressDuration,
}: QuestionFaceContentProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <Pressable
      accessibilityHint="Double tap to reveal the answer"
      accessibilityLabel={"Flashcard question: " + cardQuestion}
      accessibilityRole="button"
      delayLongPress={longPressDuration}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.content}
    >
      <View style={styles.copy}>
        <Text style={styles.prompt}>{cardQuestion}</Text>
        <Text style={styles.revealInstruction}>Double tap to reveal the answer</Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      flex: 1,
      justifyContent: "center",
      paddingVertical: sizes.spacing.screen,
    },
    copy: { gap: 22 },
    prompt: {
      color: colors.textPrimary,
      fontSize: fontSize.hero,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.tightest,
      lineHeight: lineHeight.hero,
    },
    revealInstruction: {
      color: colors.textTertiary,
      fontSize: fontSize.callout,
      lineHeight: lineHeight.subhead,
    },
  });
}
