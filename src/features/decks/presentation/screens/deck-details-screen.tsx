import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeckDetails } from "@/features/decks/presentation/hooks/use-deck-details";
import { FlashcardDetailsSheet } from "@/features/decks/presentation/components/flashcard-details-sheet";
import { DeckInfoSheet } from "@/features/decks/presentation/components/deck-info-sheet";
import { matchesFlashcardSearch } from "@/features/decks/presentation/flashcard-search";
import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { useCardAnswerAudioSource } from "@/features/audio/presentation/hooks/use-card-answer-audio-source";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight, textStyles } from "@/shared/presentation/typography";

type CardRowProps = Readonly<{
  card: Flashcard;
  onPress: () => void;
}>;

function CardRow({ card, onPress }: CardRowProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityHint="Opens question, answer, audio, and progress"
      accessibilityLabel={`Card ${card.order + 1}: ${card.question}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.cardRow}
    >
      <Text style={styles.position}>{card.order + 1}</Text>
      <Text numberOfLines={2} style={styles.question}>
        {card.question}
      </Text>
      <SymbolView
        name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
        size={sizes.icon.small}
        tintColor={colors.textMuted}
      />
    </Pressable>
  );
}
function EmptyCardList() {
  const styles = createStyles(useAppTheme().colors);

  return <Text style={styles.empty}>This deck has no cards.</Text>;
}

export default function DeckDetailsScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { appearance, cards, deck, loading, profiles } = useDeckDetails(deckId);
  const [query, setQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [showDeckInfo, setShowDeckInfo] = useState(false);
  const visibleCards = cards.filter((card) => matchesFlashcardSearch(card, query));
  const accentColor = appearance?.accentColor ?? colors.actionPrimary;
  const renderCard: ListRenderItem<Flashcard> = ({ item }) => (
    <CardRow card={item} onPress={() => setSelectedCard(item)} />
  );
  const audioSource = useCardAnswerAudioSource(deck, selectedCard);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.navigationRow}>
        <Pressable
          accessibilityLabel="Back to Library"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <SymbolView
            name={{ android: "arrow_back", ios: "chevron.left", web: "arrow_back" }}
            size={sizes.icon.medium}
            tintColor={colors.textPrimary}
          />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>
      <View style={styles.header}>
        {deck ? <DeckCover accentColor={accentColor} asset={deck.coverAsset} size="large" /> : null}
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {deck?.title ?? "Deck cards"}
          </Text>
          <Text style={styles.count}>{loading ? "Loading cards…" : `${cards.length} cards`}</Text>
        </View>
        <Pressable
          accessibilityLabel="Open deck information"
          accessibilityRole="button"
          accessibilityState={{ expanded: showDeckInfo }}
          onPress={() => setShowDeckInfo(true)}
          style={styles.infoButton}
        >
          <SymbolView
            name={{ android: "info", ios: "info.circle", web: "info" }}
            size={sizes.icon.medium}
            tintColor={colors.textSecondary}
          />
        </Pressable>
      </View>
      <View style={styles.searchShell}>
        <SymbolView
          name={{ android: "search", ios: "magnifyingglass", web: "search" }}
          size={sizes.icon.small}
          tintColor={colors.textMuted}
        />
        <TextInput
          accessibilityLabel="Search cards in deck"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Search cards…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={query}
        />
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
          data={visibleCards}
          keyExtractor={(card) => card.id}
          ListEmptyComponent={EmptyCardList}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          renderItem={renderCard}
          updateCellsBatchingPeriod={32}
          windowSize={7}
        />
      )}
      <DeckInfoSheet
        cards={cards}
        deck={deck}
        onClose={() => setShowDeckInfo(false)}
        profiles={profiles}
        visible={showDeckInfo}
      />
      <FlashcardDetailsSheet
        accentColor={accentColor}
        audioSource={audioSource}
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        profile={selectedCard ? (profiles.get(selectedCard.id) ?? null) : null}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    answer: {
      color: colors.textSecondary,
      fontSize: fontSize.bodyLarge,
      lineHeight: lineHeight.bodyLarge,
    },
    backButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.xSmall,
      height: "100%",
      paddingHorizontal: sizes.spacing.xSmall,
    },
    backLabel: { color: colors.textPrimary, fontSize: fontSize.body },
    cardCopy: { flex: 1, gap: sizes.spacing.medium },
    cardProgressFill: { borderRadius: sizes.radius.pill, height: "100%" },
    cardProgressTrack: {
      backgroundColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      height: 5,
      overflow: "hidden",
    },
    cardRow: {
      alignItems: "flex-start",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.xLarge,
    },
    count: { color: colors.textMuted, fontSize: fontSize.footnote },
    description: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
      marginTop: sizes.spacing.xSmall,
    },
    empty: { color: colors.textSecondary, padding: sizes.spacing.wide, textAlign: "center" },
    expandedContent: {
      borderTopColor: colors.border,
      borderTopWidth: sizes.border,
      gap: sizes.spacing.medium,
      marginTop: sizes.spacing.xSmall,
      paddingTop: sizes.spacing.xLarge,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingBottom: sizes.spacing.section,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.small,
    },
    headingCopy: { flex: 1 },
    infoButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
    list: { gap: sizes.spacing.medium, padding: sizes.spacing.content },

    navigationRow: {
      alignItems: "center",
      borderBottomColor: colors.border,
      borderBottomWidth: sizes.border,
      flexDirection: "row",
      height: 56,
      paddingHorizontal: sizes.spacing.xLarge,
    },
    position: {
      color: colors.textMuted,
      fontSize: fontSize.footnote,
      fontVariant: ["tabular-nums"],
      fontWeight: fontWeight.heavy,
      textAlign: "center",
      width: 22,
    },
    progressHeading: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      justifyContent: "space-between",
    },
    progressCaption: {
      color: colors.textMuted,
      flex: 1,
      fontSize: fontSize.caption,
      textAlign: "right",
    },
    question: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.subhead,
    },
    ratingFact: { alignItems: "center", flex: 1, gap: sizes.spacing.xSmall },
    ratingLabel: { color: colors.textMuted, fontSize: fontSize.caption },
    ratingRow: { flexDirection: "row", gap: sizes.spacing.small },
    ratingValue: { fontSize: fontSize.body, fontWeight: fontWeight.heavy },
    screen: { backgroundColor: colors.background, flex: 1 },
    searchInput: { color: colors.textPrimary, flex: 1, fontSize: fontSize.callout, height: 44 },
    searchShell: {
      alignItems: "center",
      borderBottomColor: colors.border,
      borderBottomWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.content,
    },
    tabs: {
      borderBottomColor: colors.border,
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
    lastReviewed: { color: colors.textMuted, fontSize: fontSize.caption },
    status: { flexShrink: 0, fontSize: fontSize.caption, fontWeight: fontWeight.bold },
    title: { color: colors.textPrimary, ...textStyles.screenTitle },
  });
}
