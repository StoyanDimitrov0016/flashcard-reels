import type { ReactNode } from "react";

import { StyleSheet, Text, View, type TextStyle } from "react-native";

import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";

import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

type QuizLayoutProps = Readonly<{
  /** The challenge panel. */
  children: ReactNode;
  /** A short instruction under the prompt, such as "Select all that apply". */
  hint?: string;
  prompt: ReactNode;
  theme: DeckThemeVariant;
}>;

/** Every quiz reads the same way: the prompt, an optional instruction, then the panel. */
export function QuizLayout({ children, hint, prompt, theme }: QuizLayoutProps) {
  return (
    <View style={styles.body}>
      <View style={styles.promptGroup}>
        {prompt}
        {!!hint && <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

type QuizPromptProps = Readonly<{ text: string; theme: DeckThemeVariant }>;

export function QuizPrompt({ text, theme }: QuizPromptProps) {
  return <FlashcardText style={quizPromptStyle(theme)} text={text} />;
}

export function quizPromptStyle(theme: DeckThemeVariant): TextStyle {
  return {
    color: theme.textPrimary,
    fontSize: fontSize.title1 + 2,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeight.title1 + 2,
  };
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: sizes.spacing.screen,
    justifyContent: "center",
    paddingVertical: sizes.spacing.content,
  },
  promptGroup: { gap: sizes.spacing.small, maxWidth: sizes.study.answerMaxWidth },
  hint: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wide,
  },
});
