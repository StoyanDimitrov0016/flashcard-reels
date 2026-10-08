import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";

import { mixColors } from "@/features/challenge-lab/presentation/color-mix";
import {
  ChunkyButton,
  type ChunkyTone,
} from "@/features/challenge-lab/presentation/components/chunky-button";
import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

export type ChallengeOption = Readonly<{ id: string; text: string; correct: boolean }>;

/** `binary` lays two answers side by side as tiles; `single` and `multiple` stack rows. */
export type OptionListKind = "binary" | "single" | "multiple";

type OptionState = "idle" | "selected" | "correct" | "missed" | "wrong" | "dimmed";

const KEY_SIZE = 26;
const TILE_HEIGHT = 96;

type ChallengeOptionListProps = Readonly<{
  kind: OptionListKind;
  onToggle: (optionId: string) => void;
  options: readonly ChallengeOption[];
  selected: readonly string[];
  submitted: boolean;
  theme: DeckThemeVariant;
}>;

/**
 * Answers inside the challenge panel, as raised buttons. Judging an answer changes only colors
 * and opacity, never sizes, so the card never moves when the learner answers.
 */
export function ChallengeOptionList({
  kind,
  onToggle,
  options,
  selected,
  submitted,
  theme,
}: ChallengeOptionListProps) {
  return (
    <View
      accessibilityRole={kind === "multiple" ? undefined : "radiogroup"}
      style={kind === "binary" ? styles.tiles : styles.rows}
    >
      {options.map((option, index) => (
        <ChallengeOptionButton
          key={option.id}
          kind={kind}
          number={index + 1}
          onPress={() => onToggle(option.id)}
          option={option}
          state={resolveOptionState(option, selected.includes(option.id), submitted)}
          theme={theme}
        />
      ))}
    </View>
  );
}

function resolveOptionState(
  option: ChallengeOption,
  isSelected: boolean,
  submitted: boolean
): OptionState {
  if (!submitted) {
    return isSelected ? "selected" : "idle";
  }
  if (option.correct) {
    return isSelected ? "correct" : "missed";
  }
  return isSelected ? "wrong" : "dimmed";
}

type ChallengeOptionButtonProps = Readonly<{
  kind: OptionListKind;
  /** Shown on the key of a pick-one row. */
  number: number;
  onPress: () => void;
  option: ChallengeOption;
  state: OptionState;
  theme: DeckThemeVariant;
}>;

function ChallengeOptionButton({
  kind,
  number,
  onPress,
  option,
  state,
  theme,
}: ChallengeOptionButtonProps) {
  const { colors } = useAppTheme();
  const look = optionLook(state, theme, colors);
  const interactive = state === "idle" || state === "selected";
  const checked = state === "selected" || state === "correct" || state === "wrong";

  if (kind === "binary") {
    return (
      <ChunkyButton
        accessibilityLabel={option.text}
        accessibilityRole="radio"
        accessibilityState={{ checked }}
        disabled={!interactive}
        faceStyle={styles.tileFace}
        onPress={onPress}
        style={[styles.tile, state === "dimmed" && styles.dimmed]}
        tone={look.tone}
      >
        <SymbolView
          name={option.id === "true" ? trueSymbol : falseSymbol}
          size={sizes.icon.large - 4}
          tintColor={look.ink}
        />
        <Text style={[styles.tileLabel, { color: theme.textPrimary }]}>{option.text}</Text>
      </ChunkyButton>
    );
  }

  return (
    <ChunkyButton
      accessibilityLabel={option.text}
      accessibilityRole={kind === "multiple" ? "checkbox" : "radio"}
      accessibilityState={{ checked }}
      disabled={!interactive}
      faceStyle={styles.rowFace}
      onPress={onPress}
      style={state === "dimmed" && styles.dimmed}
      tone={look.tone}
    >
      <View
        style={[
          styles.key,
          kind === "multiple" && styles.checkbox,
          { backgroundColor: look.keyFill, borderColor: look.ink },
        ]}
      >
        {look.symbol ? (
          <SymbolView name={look.symbol} size={sizes.icon.small - 4} tintColor={look.keyInk} />
        ) : (
          kind === "single" && <Text style={[styles.keyNumber, { color: look.ink }]}>{number}</Text>
        )}
      </View>
      <FlashcardText style={[styles.rowText, { color: theme.textPrimary }]} text={option.text} />
    </ChunkyButton>
  );
}

const trueSymbol: SymbolViewProps["name"] = {
  android: "check_circle",
  ios: "checkmark.circle.fill",
  web: "check_circle",
};
const falseSymbol: SymbolViewProps["name"] = {
  android: "cancel",
  ios: "xmark.circle.fill",
  web: "cancel",
};
const checkSymbol: SymbolViewProps["name"] = { android: "check", ios: "checkmark", web: "check" };
const crossSymbol: SymbolViewProps["name"] = { android: "close", ios: "xmark", web: "close" };

type OptionLook = Readonly<{
  tone: ChunkyTone;
  /** Key outline, key number, and tile icon. */
  ink: string;
  keyFill: string;
  keyInk: string;
  symbol: SymbolViewProps["name"] | null;
}>;

// Idle buttons are the card's own background raised on a soft edge of the deck accent. Results
// reuse the rating colors: right answers are Good, wrong ones are Again.
function optionLook(state: OptionState, theme: DeckThemeVariant, colors: AppColors): OptionLook {
  const tinted = (color: string, amount: number) => mixColors(color, theme.background, amount);
  switch (state) {
    case "selected":
      return {
        tone: { edge: theme.accent, face: tinted(theme.accent, 0.14) },
        ink: theme.accent,
        keyFill: theme.accent,
        keyInk: theme.background,
        symbol: checkSymbol,
      };
    case "correct":
      return {
        tone: { edge: colors.recallGood, face: tinted(colors.recallGood, 0.16) },
        ink: colors.recallGood,
        keyFill: colors.recallGood,
        keyInk: colors.actionPrimaryText,
        symbol: checkSymbol,
      };
    case "missed":
      return {
        tone: { edge: colors.recallGood, face: theme.background },
        ink: colors.recallGood,
        keyFill: "transparent",
        keyInk: colors.recallGood,
        symbol: checkSymbol,
      };
    case "wrong":
      return {
        tone: { edge: colors.recallAgain, face: tinted(colors.recallAgain, 0.14) },
        ink: colors.recallAgain,
        keyFill: colors.recallAgain,
        keyInk: colors.actionPrimaryText,
        symbol: crossSymbol,
      };
    case "idle":
    case "dimmed":
      break;
  }
  return {
    tone: { edge: tinted(theme.accent, 0.28), face: theme.background },
    ink: tinted(theme.accent, 0.75),
    keyFill: "transparent",
    keyInk: theme.background,
    symbol: null,
  };
}

const styles = StyleSheet.create({
  rows: { gap: sizes.spacing.medium },
  tiles: { flexDirection: "row", gap: sizes.spacing.xLarge },
  rowFace: {
    alignItems: "center",
    flexDirection: "row",
    gap: sizes.spacing.xLarge,
    minHeight: sizes.control.standard + sizes.spacing.small,
    paddingHorizontal: sizes.spacing.xLarge,
    paddingVertical: sizes.spacing.large,
  },
  tile: { flex: 1 },
  tileFace: {
    alignItems: "center",
    gap: sizes.spacing.small,
    height: TILE_HEIGHT,
    justifyContent: "center",
  },
  tileLabel: { fontSize: fontSize.title3, fontWeight: fontWeight.heavy },
  key: {
    alignItems: "center",
    borderRadius: sizes.radius.medium + 4,
    borderWidth: 2,
    height: KEY_SIZE,
    justifyContent: "center",
    width: KEY_SIZE,
  },
  checkbox: { borderRadius: sizes.radius.medium + 2 },
  keyNumber: { fontSize: fontSize.footnote, fontWeight: fontWeight.heavy },
  rowText: {
    flex: 1,
    fontSize: fontSize.callout,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.bodyLarge,
  },
  dimmed: { opacity: 0.45 },
});
