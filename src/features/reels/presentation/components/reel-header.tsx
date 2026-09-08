import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { Deck } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

type ReelHeaderProps = Readonly<{
  card: Flashcard;
  deck: Deck;
  appearance: DeckAppearance;
  index: number;
  showMainFeedLink: boolean;
  total: number;
}>;

export function ReelHeader({
  appearance,
  card,
  deck,
  index,
  showMainFeedLink,
  total,
}: ReelHeaderProps) {
  const openFocusedFeed = useOpenFocusedFeed();

  return (
    <View style={styles.header}>
      {showMainFeedLink ? (
        <View style={[styles.deckChip, { borderColor: appearance.accentColor }]}>
          <Text style={[styles.deckLabel, { color: appearance.accentColor }]}>
            {deck.title} focused
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityHint="Opens the Focus tab in Shuffle mode"
          accessibilityLabel={`Focus on ${deck.title}`}
          accessibilityRole="button"
          onPress={() => openFocusedFeed(card.deckId)}
          style={[styles.deckChip, { borderColor: appearance.accentColor }]}
        >
          <Text style={[styles.deckLabel, { color: appearance.accentColor }]}>{deck.title}</Text>
        </Pressable>
      )}
      <View style={styles.rightSide}>
        <Text style={styles.counter}>
          {index + 1} / {total}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  deckChip: {
    borderRadius: sizes.radius.pill,
    borderWidth: sizes.border,
    paddingHorizontal: sizes.spacing.xLarge,
    paddingVertical: 7,
  },
  deckLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  rightSide: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.xLarge },
  counter: { color: palette.textTertiary, fontSize: 13, fontVariant: ["tabular-nums"] },
});
