import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeckDetails } from "@/features/decks/presentation/hooks/use-deck-details";
import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight, textStyles } from "@/shared/presentation/typography";

type CardRowProps = Readonly<{ card: Flashcard }>;

function CardRow({ card }: CardRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      accessibilityHint="Shows or hides the answer"
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={() => setExpanded((current) => !current)}
      style={styles.cardRow}
    >
      <View style={styles.positionBadge}>
        <Text style={styles.position}>{card.deckPosition + 1}</Text>
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.question}>{card.question}</Text>
        {expanded ? <Text style={styles.answer}>{card.answer}</Text> : null}
      </View>
      <SymbolView
        name={{
          android: expanded ? "expand_less" : "chevron_right",
          ios: expanded ? "chevron.up" : "chevron.right",
          web: expanded ? "expand_less" : "chevron_right",
        }}
        size={sizes.icon.small}
        tintColor={palette.textMuted}
      />
    </Pressable>
  );
}

const renderCard: ListRenderItem<Flashcard> = ({ item }) => <CardRow card={item} />;

function EmptyCardList() {
  return <Text style={styles.empty}>This deck has no cards.</Text>;
}

export default function DeckDetailsScreen() {
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { appearance, cards, deck, loading } = useDeckDetails(deckId);
  const accentColor = appearance?.accentColor ?? palette.actionPrimary;

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
        {deck ? <DeckCover accentColor={accentColor} asset={deck.coverAsset} size="large" /> : null}
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {deck?.title ?? "Deck cards"}
          </Text>
          <Text style={styles.count}>{loading ? "Loading cards…" : `${cards.length} cards`}</Text>
          {deck ? (
            <Text numberOfLines={2} style={styles.description}>
              {deck.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.tabs}>
        <View style={[styles.activeTab, { borderBottomColor: accentColor }]}>
          <Text style={[styles.activeTabLabel, { color: accentColor }]}>Cards</Text>
        </View>
      </View>
      {loading ? (
        <LoadingState accessibilityLabel="Loading deck cards" />
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
  answer: {
    color: palette.textSecondary,
    fontSize: fontSize.bodyLarge,
    lineHeight: lineHeight.bodyLarge,
  },
  backButton: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  cardCopy: { flex: 1, gap: sizes.spacing.medium },
  cardRow: {
    alignItems: "flex-start",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: sizes.radius.row,
    borderWidth: sizes.border,
    flexDirection: "row",
    gap: sizes.spacing.section,
    padding: sizes.spacing.content,
  },
  count: { color: palette.textMuted, fontSize: fontSize.footnote },
  description: {
    color: palette.textSecondary,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.footnote,
    marginTop: sizes.spacing.xSmall,
  },
  empty: { color: palette.textSecondary, padding: sizes.spacing.wide, textAlign: "center" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: sizes.spacing.medium,
    padding: sizes.spacing.content,
  },
  headingCopy: { flex: 1 },
  list: { gap: sizes.spacing.medium, padding: sizes.spacing.content },
  position: {
    color: palette.textMuted,
    fontSize: fontSize.footnote,
    fontVariant: ["tabular-nums"],
    fontWeight: fontWeight.heavy,
  },
  positionBadge: {
    alignItems: "center",
    backgroundColor: palette.surfaceRaised,
    borderRadius: sizes.radius.medium,
    justifyContent: "center",
    minHeight: 30,
    minWidth: 30,
  },
  question: {
    color: palette.textPrimary,
    fontSize: fontSize.subhead,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.subhead,
  },
  screen: { backgroundColor: palette.background, flex: 1 },
  tabs: {
    borderBottomColor: palette.border,
    borderBottomWidth: sizes.border,
    paddingHorizontal: sizes.spacing.content,
  },
  activeTab: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderBottomWidth: 2,
    paddingHorizontal: sizes.spacing.xLarge,
    paddingVertical: sizes.spacing.medium,
  },
  activeTabLabel: { fontSize: fontSize.footnote, fontWeight: fontWeight.bold },
  title: { color: palette.textPrimary, ...textStyles.screenTitle },
});
