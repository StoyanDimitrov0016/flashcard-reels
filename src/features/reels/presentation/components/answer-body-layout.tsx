import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useStudyControlLayout } from "@/features/reels/presentation/context/study-control-layout-context";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

type AnswerBodyLayoutProps = Readonly<{
  answer: ReactNode;
  controls: ReactNode;
}>;

type AnswerCopyProps = Readonly<{
  answer: string;
  answerColor: string;
  promptColor: string;
  question: string;
  onLongPress: () => void;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  longPressDuration: number;
}>;

export function AnswerBodyLayout({ answer, controls }: AnswerBodyLayoutProps) {
  const { position } = useStudyControlLayout();
  const styles = createStyles(useAppTheme().colors);
  const controlRegion = <AnswerControlRegion>{controls}</AnswerControlRegion>;

  return (
    <View
      style={[
        styles.body,
        position === "bottom" ? styles.bodyBottom : styles.bodyLeft,
        position === "right" ? styles.bodyRight : styles.bodyLeft,
      ]}
    >
      {position === "left" ? (
        <>
          {controlRegion}
          {answer}
        </>
      ) : (
        <>
          {answer}
          {controlRegion}
        </>
      )}
    </View>
  );
}

function AnswerControlRegion({ children }: Readonly<{ children: ReactNode }>) {
  const { position } = useStudyControlLayout();
  const styles = createStyles(useAppTheme().colors);

  return (
    <View
      style={[
        styles.controlRegion,
        position === "bottom" ? styles.controlRegionBottom : styles.controlRegionSide,
      ]}
    >
      {children}
    </View>
  );
}

export function AnswerCopy({
  answer,
  answerColor,
  longPressDuration,
  onLongPress,
  onPress,
  onPressIn,
  onPressOut,
  question,
  promptColor,
}: AnswerCopyProps) {
  const styles = createStyles(useAppTheme().colors, promptColor, answerColor);

  return (
    <Pressable
      accessibilityHint="Double tap to return to the question"
      accessibilityLabel={"Flashcard answer: " + answer}
      accessibilityRole="button"
      delayLongPress={longPressDuration}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.copyRegion}
    >
      <View style={styles.copy}>
        <Text style={styles.answerPrompt}>{question}</Text>
        <Text style={styles.answer}>{answer}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(
  colors: AppColors,
  promptColor = colors.textSecondary,
  answerColor = colors.textPrimary
) {
  return StyleSheet.create({
    answer: {
      color: answerColor,
      fontSize: fontSize.flashcardAnswer,
      fontWeight: fontWeight.semibold,
      letterSpacing: letterSpacing.tight,
      lineHeight: lineHeight.flashcardAnswer,
      maxWidth: 480,
    },
    answerPrompt: {
      color: promptColor,
      fontSize: fontSize.title3,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.title3,
    },
    body: { flex: 1 },
    bodyBottom: { flexDirection: "column" },
    bodyLeft: { flexDirection: "row" },
    bodyRight: { flexDirection: "row" },
    copy: { gap: sizes.spacing.spacious },
    copyRegion: {
      flex: 1,
      justifyContent: "center",
      minWidth: 0,
      paddingVertical: sizes.spacing.screen,
    },
    controlRegion: { alignItems: "center", justifyContent: "center" },
    controlRegionBottom: {
      alignSelf: "center",
      paddingTop: sizes.spacing.medium,
    },
    controlRegionSide: {
      minWidth: 84,
      paddingHorizontal: sizes.spacing.xSmall,
    },
  });
}
