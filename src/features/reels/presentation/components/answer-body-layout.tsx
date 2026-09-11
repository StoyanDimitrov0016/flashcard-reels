import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RecollectionIslandPosition } from "@/features/preferences/domain/app-preferences";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

type AnswerBodyLayoutProps = Readonly<{
  children: ReactNode;
  position: RecollectionIslandPosition;
}>;

type AnswerCopyProps = Readonly<{
  answer: string;
  question: string;
  onLongPress: () => void;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  longPressDuration: number;
}>;

type AnswerControlRegionProps = Readonly<{
  children: ReactNode;
  position: RecollectionIslandPosition;
}>;

export function AnswerBodyLayout({ children, position }: AnswerBodyLayoutProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View
      style={[
        styles.body,
        position === "bottom" ? styles.bodyBottom : styles.bodyLeft,
        position === "right" ? styles.bodyRight : styles.bodyLeft,
      ]}
    >
      {children}
    </View>
  );
}

export function AnswerControlRegion({ children, position }: AnswerControlRegionProps) {
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
  longPressDuration,
  onLongPress,
  onPress,
  onPressIn,
  onPressOut,
  question,
}: AnswerCopyProps) {
  const styles = createStyles(useAppTheme().colors);

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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    answer: {
      color: colors.textPrimary,
      fontSize: fontSize.heading1,
      fontWeight: fontWeight.semibold,
      letterSpacing: letterSpacing.tight,
      lineHeight: lineHeight.heading1,
      maxWidth: 480,
    },
    answerPrompt: {
      color: colors.textSecondary,
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
