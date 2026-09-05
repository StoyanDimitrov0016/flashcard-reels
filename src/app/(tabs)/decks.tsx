import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeckCatalog } from "@/features/decks/hooks/use-deck-catalog";
import { useDeckSession } from "@/features/reels/context/deck-session-context";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

export default function DeckCatalogScreen() {
  const router = useRouter();
  const { startSession } = useDeckSession();
  const { entries, loading } = useDeckCatalog();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Decks</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator color={palette.textPrimary} size="large" />
        ) : (
          entries.map(({ appearance, cardCount, deck }) => (
            <Pressable
              accessibilityLabel={`Start ${deck.title} session`}
              accessibilityRole="button"
              key={deck.id}
              onPress={() => {
                startSession(deck.id);
                router.navigate("/(tabs)/(discover)");
              }}
              style={styles.deck}
            >
              <View style={[styles.accent, { backgroundColor: appearance.accentColor }]} />
              <View style={styles.deckCopy}>
                <Text style={styles.deckTitle}>{deck.title}</Text>
                <Text style={styles.description}>{deck.description}</Text>
                <Text style={[styles.cardCount, { color: appearance.accentColor }]}>
                  {cardCount} cards
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background, flex: 1 },
  header: { padding: sizes.spacing.screen },
  title: {
    color: palette.textPrimary,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
  },
  list: { gap: sizes.spacing.xxLarge, padding: sizes.spacing.content },
  deck: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: sizes.radius.card,
    flexDirection: "row",
    gap: sizes.spacing.section,
    minHeight: 132,
    overflow: "hidden",
    padding: sizes.spacing.content,
  },
  accent: { borderRadius: sizes.radius.medium, height: 72, width: 6 },
  deckCopy: { flex: 1, gap: sizes.spacing.small },
  deckTitle: { color: palette.textPrimary, fontSize: 21, fontWeight: "700" },
  description: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cardCount: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
});
