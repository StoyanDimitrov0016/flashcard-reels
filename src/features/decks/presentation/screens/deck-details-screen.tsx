import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeckDetails } from "@/features/decks/presentation/hooks/use-deck-details";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

function CardRow({ card }: Readonly<{ card: Flashcard }>) {
  return (
    <View style={styles.cardRow}>
      <Text style={styles.position}>{card.deckPosition + 1}</Text>
      <View style={styles.cardCopy}>
        <Text style={styles.question}>{card.question}</Text>
        <Text style={styles.answer}>{card.answer}</Text>
      </View>
    </View>
  );
}

const renderCard: ListRenderItem<Flashcard> = ({ item }) => <CardRow card={item} />;

function EmptyCardList() {
  return <Text style={styles.empty}>This deck has no cards.</Text>;
}

export default function DeckDetailsScreen() {
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { cards, deck, loading } = useDeckDetails(deckId);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to Library"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <SymbolView
            name={{ android: "arrow_back", ios: "chevron.left", web: "arrow_back" }}
            size={sizes.icon.medium}
            tintColor={palette.textPrimary}
          />
        </Pressable>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {deck?.title ?? "Deck cards"}
          </Text>
          <Text style={styles.count}>{loading ? "Loading cards…" : `${cards.length} cards`}</Text>
        </View>
      </View>
      {loading ? (
        <View accessibilityLabel="Loading deck cards" style={styles.loading}>
          <ActivityIndicator color={palette.textPrimary} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={cards}
          keyExtractor={(card) => card.id}
          ListEmptyComponent={EmptyCardList}
          renderItem={renderCard}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  answer: { color: palette.textSecondary, fontSize: 15, lineHeight: 22 },
  backButton: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  cardCopy: { flex: 1, gap: sizes.spacing.medium },
  cardRow: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: sizes.radius.card,
    borderWidth: sizes.border,
    flexDirection: "row",
    gap: sizes.spacing.section,
    padding: sizes.spacing.content,
  },
  count: { color: palette.textTertiary, fontSize: 13 },
  empty: { color: palette.textSecondary, padding: sizes.spacing.wide, textAlign: "center" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: sizes.spacing.medium,
    padding: sizes.spacing.section,
  },
  headingCopy: { flex: 1 },
  list: { gap: sizes.spacing.xLarge, padding: sizes.spacing.content },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  position: {
    color: palette.textMuted,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  question: { color: palette.textPrimary, fontSize: 17, fontWeight: "700", lineHeight: 24 },
  screen: { backgroundColor: palette.background, flex: 1 },
  title: { color: palette.textPrimary, fontSize: 24, fontWeight: "800" },
});
