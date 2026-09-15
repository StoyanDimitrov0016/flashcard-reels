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
import { DeleteDeckSheet } from "@/features/decks/presentation/components/delete-deck-sheet";
import { matchesFlashcardSearch } from "@/features/decks/presentation/flashcard-search";
import {
  resolveDeckDetailsMode,
  showsLearningProgress,
} from "@/features/decks/presentation/deck-details-mode";
import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { resolveDeckAppearance } from "@/features/decks/presentation/deck-appearance-presets";
import { useDeleteDeck } from "@/features/decks/presentation/hooks/use-delete-deck";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { FlashcardProgressSheet } from "@/features/learner-profile/presentation/components/flashcard-progress-sheet";
import { ResetProgressSheet } from "@/features/learner-profile/presentation/components/reset-progress-sheet";
import { useResetDeckProgress } from "@/features/learner-profile/presentation/hooks/use-reset-deck-progress";
import { useHaptics } from "@/features/preferences/presentation/hooks/use-haptics";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { useCardAnswerAudioSource } from "@/features/audio/presentation/hooks/use-card-answer-audio-source";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight, textStyles } from "@/shared/presentation/typography";

type CardRowProps = Readonly<{
  card: Flashcard;
  onPress: () => void;
  showProgress: boolean;
}>;

function CardRow({ card, onPress, showProgress }: CardRowProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityHint={
        showProgress
          ? "Opens question, answer, audio, and progress"
          : "Opens question, answer, and audio"
      }
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
        tintColor={colors.textTertiary}
      />
    </Pressable>
  );
}
function EmptyCardList() {
  const styles = createStyles(useAppTheme().colors);

  return <Text style={styles.empty}>This deck has no cards.</Text>;
}

export default function DeckDetailsScreen() {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { deckId, mode: modeParameter } = useLocalSearchParams<{
    deckId: string;
    mode?: string | string[];
  }>();
  const mode = resolveDeckDetailsMode(modeParameter);
  const showProgress = showsLearningProgress(mode);
  const { appearance, cards, deck, loading, profiles } = useDeckDetails(deckId);
  const { deleteDeck, deleting, error: deleteError } = useDeleteDeck();
  const resetDeckProgress = useResetDeckProgress();
  const haptics = useHaptics();
  const [query, setQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [showDeckInfo, setShowDeckInfo] = useState(false);
  const [deletePresented, setDeletePresented] = useState(false);
  const [resetPresented, setResetPresented] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const visibleCards = cards.filter((card) => matchesFlashcardSearch(card, query));
  const deckColors = appearance ? resolveDeckAppearance(appearance.presetId, resolvedScheme) : null;
  const accentColor = deckColors?.accent ?? colors.actionPrimary;
  const renderCard: ListRenderItem<Flashcard> = ({ item }) => (
    <CardRow card={item} onPress={() => setSelectedCard(item)} showProgress={showProgress} />
  );
  const audioSource = useCardAnswerAudioSource(deck, selectedCard);
  const confirmReset = () => {
    if (resetting) {
      return;
    }
    setResetting(true);
    setResetError(null);
    void resetDeckProgress(deckId)
      .then(() => {
        haptics.resetCompleted();
        setResetPresented(false);
      })
      .catch(() =>
        setResetError("The reset could not be completed. Your progress was not changed.")
      )
      .finally(() => setResetting(false));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader>
        <Pressable
          accessibilityLabel={`Back to ${showProgress ? "Progress" : "Library"}`}
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
        {showProgress ? (
          <Pressable
            accessibilityLabel={`Reset ${deck?.title ?? "deck"} progress`}
            accessibilityRole="button"
            disabled={deck === null || resetting}
            hitSlop={4}
            onPress={() => {
              setResetError(null);
              setResetPresented(true);
            }}
            style={styles.resetButton}
          >
            <SymbolView
              name={{ android: "restart_alt", ios: "arrow.counterclockwise", web: "restart_alt" }}
              size={sizes.icon.medium}
              tintColor={colors.error}
            />
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel={`Delete ${deck?.title ?? "deck"}`}
            accessibilityRole="button"
            disabled={deck === null || deleting}
            hitSlop={4}
            onPress={() => setDeletePresented(true)}
            style={styles.headerActionButton}
          >
            <SymbolView
              name={{ android: "delete", ios: "trash.fill", web: "delete" }}
              size={sizes.icon.medium}
              tintColor={colors.error}
            />
          </Pressable>
        )}
      </ScreenHeader>
      <View style={styles.body}>
        <View style={styles.header}>
          {deck ? (
            <DeckCover accentColor={accentColor} asset={deck.coverAsset} size="large" />
          ) : null}
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
            tintColor={colors.textTertiary}
          />
          <TextInput
            accessibilityLabel="Search cards in deck"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search cards…"
            placeholderTextColor={colors.textTertiary}
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
            style={styles.listView}
            updateCellsBatchingPeriod={32}
            windowSize={7}
          />
        )}
      </View>
      <DeckInfoSheet
        cards={cards}
        deck={deck}
        onClose={() => setShowDeckInfo(false)}
        profiles={profiles}
        visible={showDeckInfo}
      />
      {showProgress ? (
        <FlashcardProgressSheet
          accentColor={accentColor}
          audioSource={audioSource}
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          profile={selectedCard ? (profiles.get(selectedCard.id) ?? null) : null}
        />
      ) : (
        <FlashcardDetailsSheet
          audioSource={audioSource}
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
      {showProgress ? (
        <ResetProgressSheet
          busy={resetting}
          error={resetError}
          isPresented={resetPresented}
          onCancel={() => {
            if (!resetting) {
              setResetPresented(false);
            }
          }}
          onConfirm={confirmReset}
          scope={`${deck?.title ?? "deck"} progress`}
        />
      ) : null}
      {!showProgress ? (
        <DeleteDeckSheet
          busy={deleting}
          deck={deletePresented ? deck : null}
          error={deleteError}
          onCancel={() => {
            if (!deleting) {
              setDeletePresented(false);
            }
          }}
          onConfirm={() => {
            if (!deck) {
              return;
            }
            void deleteDeck(deck.id).then((deleted) => {
              if (deleted) {
                setDeletePresented(false);
                router.back();
              }
            });
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    backButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.xSmall,
      height: "100%",
      paddingHorizontal: sizes.spacing.xSmall,
    },
    backLabel: { color: colors.textPrimary, fontSize: fontSize.body },
    body: {
      flex: 1,
      gap: sizes.spacing.section,
      paddingTop: screenLayout.contentTopGap,
    },
    cardRow: {
      alignItems: "flex-start",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.xLarge,
    },
    count: { color: colors.textTertiary, fontSize: fontSize.footnote },
    empty: { color: colors.textSecondary, padding: sizes.spacing.wide, textAlign: "center" },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingBottom: sizes.spacing.section,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.small,
    },
    headingCopy: { flex: 1 },
    infoButton: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
    },
    list: {
      gap: sizes.spacing.medium,
      paddingBottom: sizes.spacing.content,
      paddingHorizontal: sizes.spacing.content,
    },
    listView: { flex: 1 },
    position: {
      color: colors.textTertiary,
      fontSize: fontSize.footnote,
      fontVariant: ["tabular-nums"],
      fontWeight: fontWeight.heavy,
      textAlign: "center",
      width: 22,
    },
    headerActionButton: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
    },
    resetButton: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
    },
    question: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.subhead,
    },
    screen: { backgroundColor: colors.canvas, flex: 1 },
    searchInput: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.callout,
      height: sizes.input.standard,
    },
    searchShell: {
      alignItems: "center",
      borderBottomColor: colors.borderSubtle,
      borderBottomWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.content,
    },
    tabs: {
      borderBottomColor: colors.borderSubtle,
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
    title: { color: colors.textPrimary, ...textStyles.screenTitle },
  });
}
