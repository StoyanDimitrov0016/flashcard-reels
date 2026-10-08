import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import type { Outcome } from "@/features/challenge-lab/domain/pacing-composer";
import type { ItemResponse } from "@/features/challenge-lab/presentation/challenge-lab-feed";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";

import {
  bankWords,
  blankResults,
  type BankWord,
  type FillBlanksChallenge,
  type Idea,
} from "@/features/challenge-lab/domain/idea-deck";
import { mixColors } from "@/features/challenge-lab/presentation/color-mix";
import { ChallengePanel } from "@/features/challenge-lab/presentation/components/challenge-panel";
import { CheckButton } from "@/features/challenge-lab/presentation/components/check-button";
import {
  ChunkyButton,
  type ChunkyTone,
} from "@/features/challenge-lab/presentation/components/chunky-button";
import {
  QuizLayout,
  quizPromptStyle,
} from "@/features/challenge-lab/presentation/components/quiz-layout";
import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

/** Until the bank is measured, a blank is this wide. */
const DEFAULT_BLANK_WIDTH = 96;
const CHIP_HEIGHT = 40;
/** Tall enough that a chip inside the sentence never crowds the line above it. */
const SENTENCE_LINE_HEIGHT = 48;
const placeholder = /\{\{(\d+)\}\}/g;

type ChipSize = Readonly<{ height: number; width: number }>;
type SentencePart = Readonly<{ kind: "text"; text: string } | { kind: "blank"; index: number }>;

type FillBlanksQuizProps = Readonly<{
  challenge: FillBlanksChallenge;
  idea: Idea;
  onRespond: (response: ItemResponse) => void;
  optionOrder: readonly string[];
  outcome: Outcome | null;
  response: ItemResponse | undefined;
  seed: string;
  theme: DeckThemeVariant;
}>;

/**
 * A sentence with blanks and a bank of words. Tapping a word moves it into the next empty blank;
 * tapping a filled blank sends the word back. Blanks are as wide as the widest word, so the
 * sentence never reflows as words come and go.
 */
export function FillBlanksQuiz({
  challenge,
  idea,
  onRespond,
  optionOrder,
  outcome,
  response,
  seed,
  theme,
}: FillBlanksQuizProps) {
  const styles = createStyles(theme);
  const [chipSizes, setChipSizes] = useState<Readonly<Record<string, ChipSize>>>({});
  const words = new Map(bankWords(challenge).map((word) => [word.id, word]));
  const bank = optionOrder.flatMap((id) => words.get(id) ?? []);
  const placed =
    response?.format === "fill-blanks"
      ? response.placed
      : challenge.answers.map((): string | null => null);
  const submitted = outcome !== null;
  const results = submitted ? blankResults(challenge, placed) : null;
  const blankWidth = Math.max(
    DEFAULT_BLANK_WIDTH,
    ...Object.values(chipSizes).map((size) => size.width)
  );
  const completeSentence = challenge.prompt.replace(
    placeholder,
    (_, index: string) => challenge.answers[Number(index)] ?? ""
  );

  const update = (next: readonly (string | null)[]) => {
    onRespond({ format: "fill-blanks", placed: next, submitted: false });
  };
  const place = (wordId: string) => {
    const empty = placed.indexOf(null);
    if (empty !== -1) {
      update(placed.map((current, index) => (index === empty ? wordId : current)));
    }
  };
  const clear = (blank: number) => {
    update(placed.map((current, index) => (index === blank ? null : current)));
  };
  const measureChip = (id: string) => (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setChipSizes((current) =>
      current[id]?.width === width ? current : { ...current, [id]: { height, width } }
    );
  };

  return (
    <QuizLayout
      hint="Tap the words to fill the blanks"
      prompt={
        <Text style={[quizPromptStyle(theme), styles.sentence]}>
          {splitSentence(challenge.prompt).map((part, partIndex) =>
            part.kind === "text" ? (
              // Parts come from immutable challenge text, so their position is their identity.
              // oxlint-disable-next-line react/no-array-index-key
              <FlashcardText key={partIndex} text={part.text} />
            ) : (
              <View key={`blank-${part.index}`} style={[styles.blank, { width: blankWidth }]}>
                <SentenceBlank
                  disabled={submitted}
                  onClear={() => clear(part.index)}
                  result={results?.[part.index] ?? null}
                  theme={theme}
                  word={words.get(placed[part.index] ?? "") ?? null}
                />
              </View>
            )
          )}
        </Text>
      }
      theme={theme}
    >
      <ChallengePanel
        answers={
          <>
            <View style={styles.bank}>
              {bank.map((word) => {
                const used = placed.includes(word.id);
                const size = chipSizes[word.id];
                return used && size ? (
                  <View key={word.id} style={[styles.hole, size]} />
                ) : (
                  <View key={word.id} onLayout={measureChip(word.id)}>
                    <WordChip
                      disabled={submitted || used}
                      onPress={() => place(word.id)}
                      theme={theme}
                      tone={idleTone(theme)}
                      word={word}
                    />
                  </View>
                );
              })}
            </View>
            <CheckButton
              enabled={!placed.includes(null)}
              hidden={submitted}
              onPress={() => onRespond({ format: "fill-blanks", placed, submitted: true })}
              theme={theme}
            />
          </>
        }
        explanation={outcome === "correct" ? (challenge.explanation ?? null) : completeSentence}
        explanationCandidates={[
          ...new Set([completeSentence, ...(challenge.explanation ? [challenge.explanation] : [])]),
        ]}
        idea={idea}
        outcome={outcome}
        seed={seed}
        theme={theme}
      />
    </QuizLayout>
  );
}

type SentenceBlankProps = Readonly<{
  disabled: boolean;
  onClear: () => void;
  /** Whether the placed word is right, once checked. */
  result: boolean | null;
  theme: DeckThemeVariant;
  word: BankWord | null;
}>;

function SentenceBlank({ disabled, onClear, result, theme, word }: SentenceBlankProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(theme);
  if (!word) {
    return <View style={styles.emptyBlank} />;
  }
  return (
    <WordChip
      disabled={disabled}
      onPress={onClear}
      stretch
      theme={theme}
      tone={resultTone(result, theme, colors)}
      word={word}
    />
  );
}

type WordChipProps = Readonly<{
  disabled: boolean;
  onPress: () => void;
  /** Fill the blank's width instead of hugging the word. */
  stretch?: boolean;
  theme: DeckThemeVariant;
  tone: ChunkyTone;
  word: BankWord;
}>;

function WordChip({ disabled, onPress, stretch = false, theme, tone, word }: WordChipProps) {
  return (
    <ChunkyButton
      accessibilityLabel={word.text}
      accessibilityRole="button"
      disabled={disabled}
      faceStyle={chipStyles.face}
      onPress={onPress}
      style={stretch && chipStyles.stretch}
      tone={tone}
    >
      <FlashcardText
        numberOfLines={1}
        style={[chipStyles.label, { color: theme.textPrimary }]}
        text={word.text}
      />
    </ChunkyButton>
  );
}

function idleTone(theme: DeckThemeVariant): ChunkyTone {
  return { edge: mixColors(theme.accent, theme.background, 0.28), face: theme.background };
}

function resultTone(result: boolean | null, theme: DeckThemeVariant, colors: AppColors) {
  if (result === null) {
    return { edge: theme.accent, face: mixColors(theme.accent, theme.background, 0.14) };
  }
  const color = result ? colors.recallGood : colors.recallAgain;
  return { edge: color, face: mixColors(color, theme.background, 0.16) };
}

function splitSentence(prompt: string): readonly SentencePart[] {
  const parts: SentencePart[] = [];
  let cursor = 0;
  for (const match of prompt.matchAll(placeholder)) {
    const start = match.index;
    if (start > cursor) {
      parts.push({ kind: "text", text: prompt.slice(cursor, start) });
    }
    parts.push({ kind: "blank", index: Number(match[1]) });
    cursor = start + match[0].length;
  }
  if (cursor < prompt.length) {
    parts.push({ kind: "text", text: prompt.slice(cursor) });
  }
  return parts;
}

const chipStyles = StyleSheet.create({
  face: {
    alignItems: "center",
    height: CHIP_HEIGHT - 4,
    justifyContent: "center",
    paddingHorizontal: sizes.spacing.xLarge,
  },
  label: { fontSize: fontSize.callout, fontWeight: fontWeight.bold },
  stretch: { alignSelf: "stretch" },
});

function createStyles(theme: DeckThemeVariant) {
  return StyleSheet.create({
    sentence: { lineHeight: SENTENCE_LINE_HEIGHT },
    blank: { height: CHIP_HEIGHT, justifyContent: "center", marginHorizontal: 2 },
    emptyBlank: {
      borderBottomColor: theme.accent,
      borderBottomWidth: 3,
      height: CHIP_HEIGHT - 6,
    },
    bank: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: sizes.spacing.medium,
      justifyContent: "center",
    },
    hole: {
      backgroundColor: `${theme.accent}14`,
      borderRadius: sizes.radius.row + 2,
    },
  });
}
