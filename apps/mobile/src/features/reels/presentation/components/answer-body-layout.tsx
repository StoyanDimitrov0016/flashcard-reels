import type { ReactNode } from "react";

import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { toSpokenFlashcardText } from "@/features/flashcards/domain/flashcard-text";
import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { useStudyControlLayout } from "@/features/reels/presentation/context/study-control-layout-context";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

type AnswerBodyLayoutProps = Readonly<{
  children: ReactNode;
}>;

export function AnswerBodyLayout({ children }: AnswerBodyLayoutProps) {
  const { position } = useStudyControlLayout();
  const styles = createStyles(useAppTheme().colors);
  let bodyStyle: ViewStyle = styles.bodyRight;
  if (position === "bottom") {
    bodyStyle = styles.bodyBottom;
  } else if (position === "left") {
    bodyStyle = styles.bodyLeft;
  }

  return <View style={[styles.body, bodyStyle]}>{children}</View>;
}

type AnswerControlRegionProps = Readonly<{ children: ReactNode }>;

export function AnswerControlRegion({ children }: AnswerControlRegionProps) {
  const { position } = useStudyControlLayout();
  const styles = createStyles(useAppTheme().colors);

  return (
    <View
      style={[
        styles.controlRegion,
        position === "bottom" ? styles.controlRegionBottom : styles.controlRegionSide,
        position === "left" && styles.controlRegionLeft,
        position === "right" && styles.controlRegionRight,
      ]}
    >
      {children}
    </View>
  );
}

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
      accessibilityLabel={"Flashcard answer: " + toSpokenFlashcardText(answer)}
      accessibilityRole="button"
      delayLongPress={longPressDuration}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.copyRegion}
    >
      <View style={styles.copy}>
        <FlashcardText style={styles.answerPrompt} text={question} />
        <FlashcardText style={styles.answer} text={answer} />
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
      maxWidth: sizes.study.answerMaxWidth,
    },
    answerPrompt: {
      color: promptColor,
      fontSize: fontSize.title3,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.title3,
    },
    body: { flex: 1 },
    bodyBottom: { flexDirection: "column" },
    bodyLeft: { flexDirection: "row-reverse" },
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
      minWidth: sizes.study.sideControlRegion,
      paddingHorizontal: sizes.spacing.xSmall,
    },
    controlRegionLeft: { marginLeft: -sizes.study.sideEdgeOffset },
    controlRegionRight: { marginRight: -sizes.study.sideEdgeOffset },
  });
}
