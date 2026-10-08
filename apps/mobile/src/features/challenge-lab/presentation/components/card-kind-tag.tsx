import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import type { ResolvedColorScheme } from "@/shared/domain/color-scheme";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing } from "@/shared/presentation/typography";

/** What the learner is about to do: read a new idea, recall a flashcard, or answer a quiz. */
type CardKindTagKind = "idea" | "flashcard" | "quiz";

type CardKindLook = Readonly<{
  color: Readonly<Record<ResolvedColorScheme, string>>;
  label: string;
  symbol: SymbolViewProps["name"];
}>;

// Fixed across decks, so the kind reads the same on every theme. Each color reaches 4.5:1 on all
// ten deck backgrounds in its color mode. In the app these would be palette tokens.
const flashcardColor = { light: "#4338CA", dark: "#A5B4FC" } as const;
const quizColor = { light: "#A21CAF", dark: "#F0ABFC" } as const;

const looks: Readonly<Record<CardKindTagKind, CardKindLook>> = {
  // A new idea has its statement on the back, so it shares the flashcard color.
  idea: {
    color: flashcardColor,
    label: "New idea",
    symbol: { android: "lightbulb", ios: "lightbulb.fill", web: "lightbulb" },
  },
  flashcard: {
    color: flashcardColor,
    label: "Flashcard",
    symbol: { android: "style", ios: "rectangle.on.rectangle", web: "style" },
  },
  quiz: {
    color: quizColor,
    label: "Quiz",
    symbol: { android: "quiz", ios: "checklist", web: "quiz" },
  },
};

type CardKindTagProps = Readonly<{ kind: CardKindTagKind }>;

/** The header's trailing tag. It mirrors the deck label: a short name over an underline. */
export function CardKindTag({ kind }: CardKindTagProps) {
  const { resolvedScheme } = useAppTheme();
  const look = looks[kind];
  const color = look.color[resolvedScheme];

  return (
    <View accessibilityLabel={look.label} accessible style={styles.labelStack}>
      <View style={styles.labelRow}>
        <SymbolView name={look.symbol} size={sizes.icon.small - 4} tintColor={color} />
        <Text style={[styles.label, { color }]}>{look.label}</Text>
      </View>
      <View style={[styles.underline, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  labelStack: { alignItems: "center", paddingVertical: sizes.spacing.xSmall },
  labelRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wide,
  },
  underline: {
    alignSelf: "stretch",
    borderRadius: sizes.radius.small,
    height: 3,
    marginTop: 5,
  },
});
