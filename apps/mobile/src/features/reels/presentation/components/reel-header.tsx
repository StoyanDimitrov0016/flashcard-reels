import type { ReactNode } from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing } from "@/shared/presentation/typography";

type ReelHeaderProps = Readonly<{
  /** Shown at the trailing edge, such as a tag naming the kind of card. */
  accessory?: ReactNode;
  theme: Readonly<Pick<DeckThemeVariant, "accent">>;
  card: Flashcard;
  deck: Deck;
  deckCardCount: number;
  onOpenFocus?: () => void;
  showMainFeedLink: boolean;
}>;

export function ReelHeader({
  accessory,
  theme,
  card,
  deck,
  deckCardCount,
  onOpenFocus,
  showMainFeedLink,
}: ReelHeaderProps) {
  const label = `${deck.title} ${card.order + 1}/${deckCardCount}`;

  return (
    <View style={styles.header}>
      {showMainFeedLink ? (
        <View style={styles.labelStack}>
          <Text style={[styles.deckLabel, { color: theme.accent }]}>{label}</Text>
          <View style={[styles.accentLine, { backgroundColor: theme.accent }]} />
        </View>
      ) : (
        <Pressable
          accessibilityHint="Opens the Focus tab with this card visible"
          accessibilityLabel={`Focus on ${label}`}
          accessibilityRole="button"
          onPress={onOpenFocus}
          style={styles.labelStack}
        >
          <Text style={[styles.deckLabel, { color: theme.accent }]}>{label}</Text>
          <View style={[styles.accentLine, { backgroundColor: theme.accent }]} />
        </Pressable>
      )}
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  accentLine: {
    alignSelf: "stretch",
    borderRadius: sizes.radius.small,
    height: 3,
    marginTop: 5,
  },
  deckLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.wide,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    height: screenLayout.headerHeight,
  },
  labelStack: { alignItems: "center", paddingVertical: sizes.spacing.xSmall },
});
