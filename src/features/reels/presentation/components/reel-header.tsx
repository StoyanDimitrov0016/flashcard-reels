import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { Deck } from "@/features/decks/domain/deck.model";
import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing } from "@/shared/presentation/typography";

type ReelHeaderProps = Readonly<{
  appearance: DeckAppearance;
  card: Flashcard;
  deck: Deck;
  deckCardCount: number;
  showMainFeedLink: boolean;
}>;

export function ReelHeader({
  appearance,
  card,
  deck,
  deckCardCount,
  showMainFeedLink,
}: ReelHeaderProps) {
  const openFocusedFeed = useOpenFocusedFeed();
  const label = `${deck.title} ${card.position + 1}/${deckCardCount}`;

  return (
    <View style={styles.header}>
      {showMainFeedLink ? (
        <View style={styles.focusedIdentity}>
          <DeckCover accentColor={appearance.accentColor} asset={deck.coverAsset} />
          <View style={styles.labelStack}>
            <Text style={[styles.deckLabel, { color: appearance.accentColor }]}>{label}</Text>
            <View style={[styles.accentLine, { backgroundColor: appearance.accentColor }]} />
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityHint="Opens the Focus tab in Shuffle mode"
          accessibilityLabel={`Focus on ${label}`}
          accessibilityRole="button"
          onPress={() => openFocusedFeed(card.deckId)}
          style={styles.labelStack}
        >
          <Text style={[styles.deckLabel, { color: appearance.accentColor }]}>{label}</Text>
          <View style={[styles.accentLine, { backgroundColor: appearance.accentColor }]} />
        </Pressable>
      )}
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
  focusedIdentity: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.xLarge },
  header: { alignItems: "center", flexDirection: "row" },
  labelStack: { alignItems: "center", paddingVertical: 4 },
});
