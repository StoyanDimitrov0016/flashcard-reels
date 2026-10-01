import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { useFlashcardAudioSource } from "@/features/audio/presentation/controllers/use-flashcard-audio-source";
import {
  DeckActionsSheet,
  type DeckAction,
} from "@/features/decks/presentation/components/deck-actions-sheet";
import { DeckInfoSheet } from "@/features/decks/presentation/components/deck-info-sheet";
import { DeckProfileHeader } from "@/features/decks/presentation/components/deck-profile-header";
import { DeckThemeSelectionSheet } from "@/features/decks/presentation/components/deck-theme-selection-sheet";
import { DeleteDeckSheet } from "@/features/decks/presentation/components/delete-deck-sheet";
import { useDeckDetails } from "@/features/decks/presentation/controllers/use-deck-details";
import { useDeleteDeck } from "@/features/decks/presentation/controllers/use-delete-deck";
import { useSaveDeckThemeSelection } from "@/features/decks/presentation/controllers/use-save-deck-theme-selection";
import { resolveDeckTheme, type DeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { matchesFlashcardSearch } from "@/features/decks/presentation/flashcard-search";
import { useDeckRouteId } from "@/features/decks/presentation/hooks/use-deck-route-id";
import { FlashcardProgressSheet } from "@/features/flashcard-progress/presentation/components/flashcard-progress-sheet";
import { ResetProgressSheet } from "@/features/flashcard-progress/presentation/components/reset-progress-sheet";
import { useResetDeckProgress } from "@/features/flashcard-progress/presentation/controllers/use-reset-deck-progress";
import { countReviewedCards } from "@/features/flashcard-progress/presentation/review-summary";
import { toSpokenFlashcardText } from "@/features/flashcards/domain/flashcard-text";
import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { LessonSearchResults } from "@/features/lessons/presentation/components/lesson-search-results";
import { useReadingLists } from "@/features/lessons/presentation/controllers/use-reading-lists";
import { getLessonHref } from "@/features/lessons/presentation/lesson-href";
import { useHaptics } from "@/features/preferences/presentation/controllers/use-haptics";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import { reportError } from "@/shared/errors/report-error";
import { EmptyState } from "@/shared/presentation/components/empty-state";
import { ErrorState } from "@/shared/presentation/components/error-state";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { SearchField } from "@/shared/presentation/components/search-field";
import { SegmentedControl } from "@/shared/presentation/components/segmented-control";
import { SubScreenHeader } from "@/shared/presentation/components/sub-screen-header";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";
import { showSuccessToast } from "@/shared/presentation/flashcard-toast";
import { useSingleFlight } from "@/shared/presentation/hooks/use-single-flight";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type DeckPageTab = "lessons" | "cards";

const deckPageTabs = [
  { label: "Lessons", value: "lessons" },
  { label: "Cards", value: "cards" },
] as const;

type CardRowProps = Readonly<{
  card: Flashcard;
  onPress: () => void;
  /** Fits the deck's largest card number, so numbers line up and never wrap. */
  numberWidth: number;
  position: "first" | "middle" | "last" | "only";
}>;

/** One row of the grouped card list: rows share a card, split by inset dividers. */
function CardRow({ card, numberWidth, onPress, position }: CardRowProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityHint="Opens question, answer, audio, and progress"
      accessibilityLabel={`Card ${card.order + 1}: ${toSpokenFlashcardText(card.question)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardRow,
        (position === "first" || position === "only") && styles.cardRowFirst,
        (position === "last" || position === "only") && styles.cardRowLast,
        pressed && styles.cardRowPressed,
      ]}
    >
      <Text numberOfLines={1} style={[styles.position, { width: numberWidth }]}>
        {card.order + 1}
      </Text>
      <FlashcardText numberOfLines={2} style={styles.question} text={card.question} />
      <SymbolView
        name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
        size={sizes.icon.small}
        tintColor={colors.textTertiary}
      />
      {position !== "last" && position !== "only" && (
        <View style={[styles.divider, { left: getDividerInset(numberWidth) }]} />
      )}
    </Pressable>
  );
}
function EmptyCardList() {
  return (
    <EmptyState
      icon={{ android: "search_off", ios: "magnifyingglass", web: "search_off" }}
      message="Try another word from the question or answer."
      title="No cards found"
    />
  );
}

// Footnote-size tabular digits are about 8pt wide.
const DIGIT_WIDTH = 9;

function getNumberWidth(cardCount: number): number {
  return Math.max(22, String(Math.max(cardCount, 1)).length * DIGIT_WIDTH);
}

function getDividerInset(numberWidth: number): number {
  return sizes.spacing.xLarge + numberWidth + sizes.spacing.medium;
}

function getRowPosition(index: number, count: number): CardRowProps["position"] {
  if (count === 1) {
    return "only";
  }
  if (index === 0) {
    return "first";
  }
  return index === count - 1 ? "last" : "middle";
}

export default function DeckDetailsScreen() {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const deckId = useDeckRouteId();
  const openFocusedFeed = useOpenFocusedFeed();
  const { clearDeleteError, deleteDeck, deleting, error: deleteError } = useDeleteDeck();
  const { themeSelection, cards, deck, loading, progress } = useDeckDetails(deckId, !deleting);
  const { readingLists } = useReadingLists();
  const { clearSaveError, pendingPreset, saveError, savePreset } = useSaveDeckThemeSelection();
  const resetDeckProgress = useResetDeckProgress();
  const haptics = useHaptics();
  const [tab, setTab] = useState<DeckPageTab>("lessons");
  const [query, setQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [actionsPresented, setActionsPresented] = useState(false);
  // Opened once the actions sheet has closed, so two sheets never animate at once.
  const [queuedAction, setQueuedAction] = useState<DeckAction | null>(null);
  const [themePresented, setThemePresented] = useState(false);
  const [showDeckInfo, setShowDeckInfo] = useState(false);
  const [deletePresented, setDeletePresented] = useState(false);
  const [resetPresented, setResetPresented] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const lessons = readingLists.find((list) => list.deckId === deckId)?.lessons ?? [];
  const activeTab: DeckPageTab = lessons.length > 0 ? tab : "cards";
  const visibleCards = cards.filter((card) => matchesFlashcardSearch(card, query));
  const deckColors = themeSelection ? resolveDeckTheme(themeSelection.theme, resolvedScheme) : null;
  const accentColor = deckColors?.accent ?? colors.actionPrimary;
  const numberWidth = getNumberWidth(cards.length);
  const renderCard: ListRenderItem<Flashcard> = ({ index, item }) => (
    <CardRow
      card={item}
      onPress={() => setSelectedCard(item)}
      numberWidth={numberWidth}
      position={getRowPosition(index, visibleCards.length)}
    />
  );
  const audioSource = useFlashcardAudioSource(deck, selectedCard);
  const reset = useSingleFlight(async (): Promise<void> => {
    if (deckId === null) {
      return;
    }
    setResetError(null);
    try {
      await resetDeckProgress(deckId);
      if (!reset.isActive()) {
        return;
      }
      haptics.resetCompleted();
      setResetPresented(false);
    } catch (error) {
      reportError(error, "Deck progress reset failure");
      setResetError(getErrorFeedback(error).message);
    }
  });
  const resetting = reset.busy;
  const confirmReset = () => void reset.run();
  const openAction = (action: DeckAction) => {
    switch (action) {
      case "theme":
        clearSaveError();
        setThemePresented(true);
        break;
      case "info":
        setShowDeckInfo(true);
        break;
      case "reset":
        setResetError(null);
        setResetPresented(true);
        break;
      case "delete":
        setDeletePresented(true);
        break;
    }
  };
  const selectTheme = (preset: DeckTheme) => {
    if (deckId !== null) {
      void savePreset(deckId, preset);
    }
  };

  if (!loading && !deck) {
    return (
      <ErrorState
        title="This deck is no longer installed"
        message="It may have been deleted. You can import it again."
        actions={[{ label: "Go to Decks", onPress: () => router.dismissTo("/(tabs)/decks") }]}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <SubScreenHeader
        actions={
          <Pressable
            accessibilityLabel={`More actions for ${deck?.title ?? "this deck"}`}
            accessibilityRole="button"
            disabled={deck === null}
            hitSlop={4}
            onPress={() => setActionsPresented(true)}
            style={styles.moreButton}
          >
            <SymbolView
              name={{ android: "more_horiz", ios: "ellipsis.circle", web: "more_horiz" }}
              size={sizes.icon.medium}
              tintColor={colors.textSecondary}
            />
          </Pressable>
        }
        backLabel="Back to Decks"
        onBack={() => router.back()}
      />
      <View style={styles.body}>
        {loading || !deck ? (
          <LoadingState accessibilityLabel="Loading deck" />
        ) : (
          <>
            <DeckProfileHeader
              accentColor={accentColor}
              cardCount={cards.length}
              deck={deck}
              lessonCount={lessons.length}
              onStudy={() => openFocusedFeed(deck.id, null)}
              reviewedCount={countReviewedCards(progress.values())}
            />
            {lessons.length > 0 && (
              <View style={styles.tabs}>
                <SegmentedControl onChange={setTab} options={deckPageTabs} selected={activeTab} />
              </View>
            )}
            {/* One search under the toggle; it narrows whichever list is shown. */}
            <View style={styles.search}>
              <SearchField
                accessibilityLabel={
                  activeTab === "lessons" ? "Search lessons in deck" : "Search cards in deck"
                }
                clearLabel={activeTab === "lessons" ? "Clear lesson search" : "Clear card search"}
                onChangeText={setQuery}
                placeholder={activeTab === "lessons" ? "Search lessons…" : "Search cards…"}
                value={query}
              />
            </View>
            {activeTab === "lessons" ? (
              <ScrollView contentContainerStyle={styles.lessons} style={styles.listView}>
                <LessonSearchResults
                  lessons={lessons}
                  onOpen={(lesson) => router.push(getLessonHref(lesson.id))}
                  query={query}
                />
              </ScrollView>
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
          </>
        )}
      </View>
      <DeckActionsSheet
        deckTitle={deck?.title ?? "Deck"}
        onClose={() => {
          setActionsPresented(false);
          if (queuedAction) {
            setQueuedAction(null);
            openAction(queuedAction);
          }
        }}
        onSelect={(action) => {
          setQueuedAction(action);
          setActionsPresented(false);
        }}
        visible={actionsPresented}
      />
      <DeckThemeSelectionSheet
        deck={deck}
        error={saveError}
        isPresented={themePresented}
        onDismiss={() => {
          if (!pendingPreset) {
            setThemePresented(false);
          }
        }}
        onSelect={selectTheme}
        pendingPreset={pendingPreset}
        themeSelection={themeSelection}
      />
      <DeckInfoSheet
        cards={cards}
        deck={deck}
        onClose={() => setShowDeckInfo(false)}
        progress={progress}
        visible={showDeckInfo}
      />
      <FlashcardProgressSheet
        accentColor={accentColor}
        audioSource={audioSource}
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        progress={selectedCard ? (progress.get(selectedCard.id) ?? null) : null}
      />
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
      <DeleteDeckSheet
        busy={deleting}
        deck={deletePresented ? deck : null}
        error={deleteError}
        onCancel={() => {
          if (!deleting) {
            clearDeleteError();
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
              router.dismissTo("/(tabs)/decks");
              showSuccessToast("Deck deleted.");
            }
          });
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    body: {
      flex: 1,
      gap: sizes.spacing.section,
      paddingTop: screenLayout.contentTopGap,
    },
    cardRow: {
      alignItems: "flex-start",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderLeftWidth: sizes.border,
      borderRightWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.xLarge,
    },
    cardRowFirst: {
      borderTopLeftRadius: sizes.radius.row,
      borderTopRightRadius: sizes.radius.row,
      borderTopWidth: sizes.border,
    },
    cardRowLast: {
      borderBottomLeftRadius: sizes.radius.row,
      borderBottomRightRadius: sizes.radius.row,
      borderBottomWidth: sizes.border,
    },
    cardRowPressed: { backgroundColor: colors.surfaceHover },
    divider: {
      backgroundColor: colors.borderSubtle,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      position: "absolute",
      right: 0,
    },
    lessons: {
      paddingBottom: sizes.spacing.content,
      paddingHorizontal: sizes.spacing.content,
    },
    list: {
      paddingBottom: sizes.spacing.content,
      paddingHorizontal: sizes.spacing.content,
    },
    listView: { flex: 1 },
    moreButton: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
    },
    position: {
      color: colors.textTertiary,
      fontSize: fontSize.footnote,
      fontVariant: ["tabular-nums"],
      fontWeight: fontWeight.heavy,
      textAlign: "center",
    },
    question: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.subhead,
    },
    screen: { backgroundColor: colors.canvas, flex: 1 },
    search: { paddingHorizontal: sizes.spacing.content },
    tabs: { paddingHorizontal: sizes.spacing.content },
  });
}
