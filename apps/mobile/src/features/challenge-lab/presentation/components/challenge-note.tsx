import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import type { Idea } from "@/features/challenge-lab/domain/idea-deck";
import type { Outcome } from "@/features/challenge-lab/domain/pacing-composer";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";

import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

const VERDICT_ICON_SIZE = 32;

type ChallengeNoteProps = Readonly<{
  /** The explanation for this answer, or null when the idea says it all. */
  explanation: string | null;
  /** Every explanation this challenge could show. All are laid out so the note never resizes. */
  explanationCandidates: readonly string[];
  idea: Idea;
  outcome: Outcome | null;
  /** Picks the encouragement, so a reel keeps its wording when it is scrolled back to. */
  seed: string;
  theme: DeckThemeVariant;
}>;

/** What the learner sees after answering: how they did, why, and the idea itself. */
export function ChallengeNote({
  explanation,
  explanationCandidates,
  idea,
  outcome,
  seed,
  theme,
}: ChallengeNoteProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(theme);
  const verdict = verdictFor(outcome ?? "correct", colors, seed);

  return (
    <View style={styles.note}>
      <View accessibilityRole="header" style={styles.verdict}>
        <View style={[styles.verdictIcon, { backgroundColor: verdict.color }]}>
          <SymbolView
            name={verdict.symbol}
            size={sizes.icon.small - 2}
            tintColor={colors.actionPrimaryText}
          />
        </View>
        <Text style={[styles.verdictLabel, { color: verdict.color }]}>{verdict.label}</Text>
      </View>
      {explanationCandidates.length > 0 && (
        <View style={styles.explanationSlot}>
          {explanationCandidates.map((candidate, index) => {
            const shown = candidate === explanation;
            return (
              <View
                accessibilityElementsHidden={!shown}
                importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
                key={candidate}
                style={[
                  styles.explanationLayer,
                  index > 0 && styles.stackedLayer,
                  !shown && styles.hidden,
                ]}
              >
                <FlashcardText style={styles.explanation} text={candidate} />
              </View>
            );
          })}
        </View>
      )}
      <View style={styles.idea}>
        <Text style={styles.ideaTitle}>{idea.title}</Text>
        <FlashcardText style={styles.ideaStatement} text={idea.statement} />
      </View>
    </View>
  );
}

type Verdict = Readonly<{ color: string; label: string; symbol: SymbolViewProps["name"] }>;

// Short, warm, and varied, so a run of answers doesn't read like a grader.
const encouragement: Readonly<Record<Outcome, readonly string[]>> = {
  correct: ["Nice!", "Great job!", "You got it!", "Spot on!", "Exactly!"],
  partial: ["Almost!", "So close!", "Nearly there!"],
  missed: ["Not quite", "Not this time", "Good try"],
};

export function outcomeColor(outcome: Outcome, colors: AppColors): string {
  if (outcome === "correct") {
    return colors.recallGood;
  }
  return outcome === "partial" ? colors.recallHard : colors.recallAgain;
}

const verdictSymbols: Readonly<Record<Outcome, SymbolViewProps["name"]>> = {
  correct: { android: "check", ios: "checkmark", web: "check" },
  partial: { android: "remove", ios: "minus", web: "remove" },
  missed: { android: "close", ios: "xmark", web: "close" },
};

function verdictFor(outcome: Outcome, colors: AppColors, seed: string): Verdict {
  const phrases = encouragement[outcome];
  return {
    color: outcomeColor(outcome, colors),
    label: phrases[stableIndex(seed, phrases.length)] ?? "",
    symbol: verdictSymbols[outcome],
  };
}

function stableIndex(seed: string, length: number): number {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 1_000_003;
  }
  return hash % length;
}

function createStyles(theme: DeckThemeVariant) {
  return StyleSheet.create({
    note: { gap: sizes.spacing.xLarge },
    verdict: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.large },
    verdictIcon: {
      alignItems: "center",
      borderRadius: sizes.radius.pill,
      height: VERDICT_ICON_SIZE,
      justifyContent: "center",
      width: VERDICT_ICON_SIZE,
    },
    verdictLabel: { fontSize: fontSize.title2, fontWeight: fontWeight.heavy },
    // Every candidate shares one cell: each is full width, and later ones pull back over the
    // first, so the slot is as tall as the longest explanation.
    explanationSlot: { flexDirection: "row" },
    explanationLayer: { width: "100%" },
    stackedLayer: { marginLeft: "-100%" },
    hidden: { opacity: 0 },
    explanation: {
      color: theme.textPrimary,
      fontSize: fontSize.callout,
      lineHeight: lineHeight.subhead,
    },
    idea: {
      borderTopColor: `${theme.accent}33`,
      borderTopWidth: sizes.border,
      gap: sizes.spacing.xSmall,
      paddingTop: sizes.spacing.xLarge,
    },
    ideaTitle: {
      color: theme.accent,
      fontSize: fontSize.footnote,
      fontWeight: fontWeight.heavy,
    },
    ideaStatement: {
      color: theme.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
    },
  });
}
