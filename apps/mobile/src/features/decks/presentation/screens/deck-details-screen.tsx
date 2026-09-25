import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { useCardAnswerAudioSource } from "@/features/audio/presentation/controllers/use-card-answer-audio-source";
import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { DeckInfoSheet } from "@/features/decks/presentation/components/deck-info-sheet";
import { DeleteDeckSheet } from "@/features/decks/presentation/components/delete-deck-sheet";
import { FlashcardDetailsSheet } from "@/features/decks/presentation/components/flashcard-details-sheet";
import { useDeckDetails } from "@/features/decks/presentation/controllers/use-deck-details";
import { useDeleteDeck } from "@/features/decks/presentation/controllers/use-delete-deck";
import { resolveDeckAppearance } from "@/features/decks/presentation/deck-appearance-presets";
import {
  resolveDeckDetailsMode,
  showsLearningProgress,
} from "@/features/decks/presentation/deck-details-mode";
import { matchesFlashcardSearch } from "@/features/decks/presentation/flashcard-search";
import { FlashcardProgressSheet } from "@/features/flashcard-progress/presentation/components/flashcard-progress-sheet";
import { ResetProgressSheet } from "@/features/flashcard-progress/presentation/components/reset-progress-sheet";
import { useResetDeckProgress } from "@/features/flashcard-progress/presentation/controllers/use-reset-deck-progress";
import { toSpokenFlashcardText } from "@/features/flashcards/domain/flashcard-text";
import { FlashcardText } from "@/features/flashcards/presentation/components/flashcard-text";
import { useHaptics } from "@/features/preferences/presentation/controllers/use-haptics";
import { reportError } from "@/shared/errors/report-error";
import { EmptyState } from "@/shared/presentation/components/empty-state";
import { ErrorState } from "@/shared/presentation/components/error-state";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { SearchField } from "@/shared/presentation/components/search-field";
import { SubScreenHeader } from "@/shared/presentation/components/sub-screen-header";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";
import { showSuccessToast } from "@/shared/presentation/flashcard-toast";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight, textStyles } from "@/shared/presentation/typography";

type CardRowProps = Readonly<{
  card: Flashcard;
  onPress: () => void;
  /** Fits the deck's largest card number, so numbers line up and never wrap. */
  numberWidth: number;
  position: "first" | "middle" | "last" | "only";
  showProgress: boolean;
}>;

/** One row of the grouped card list: rows share a card, split by inset dividers. */
function CardRow({ card, numberWidth, onPress, position, showProgress }: CardRowProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityHint={
        showProgress
          ? "Opens question, answer, audio, and progress"
          : "Opens question, answer, and audio"
      }
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
  const { deckId, mode: modeParameter } = useLocalSearchParams<{
    deckId: string;
    mode?: string | string[];
  }>();
  const mode = resolveDeckDetailsMode(modeParameter);
  const showProgress = showsLearningProgress(mode);
  const { clearDeleteError, deleteDeck, deleting, error: deleteError } = useDeleteDeck();
  const { appearance, cards, deck, loading, progress } = useDeckDetails(deckId, !deleting);
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
  const numberWidth = getNumberWidth(cards.length);
  const renderCard: ListRenderItem<Flashcard> = ({ index, item }) => (
    <CardRow
      card={item}
      onPress={() => setSelectedCard(item)}
      numberWidth={numberWidth}
      position={getRowPosition(index, visibleCards.length)}
      showProgress={showProgress}
    />
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
      .catch((error: unknown) => {
        reportError(error, "Deck progress reset failure");
        setResetError(getErrorFeedback(error).message);
      })
      .finally(() => setResetting(false));
  };

  if (!loading && !deck) {
    return (
      <ErrorState
        title="This deck is no longer in your library"
        message="It may have been deleted. You can import it again."
        actions={[{ label: "Go to Library", onPress: () => router.dismissTo("/(tabs)/library") }]}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <SubScreenHeader
        actions={
          showProgress ? (
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
          )
        }
        backLabel={`Back to ${showProgress ? "Progress" : "Library"}`}
        onBack={() => router.back()}
      />
      <View style={styles.body}>
        <View style={styles.header}>
          {!!deck && <DeckCover accentColor={accentColor} asset={deck.coverAsset} size="large" />}
          <View style={styles.headingCopy}>
            <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
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
        <View style={styles.search}>
          <SearchField
            accessibilityLabel="Search cards in deck"
            clearLabel="Clear card search"
            onChangeText={setQuery}
            placeholder="Search cards…"
            value={query}
          />
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
        progress={progress}
        visible={showDeckInfo}
      />
      {showProgress ? (
        <FlashcardProgressSheet
          accentColor={accentColor}
          audioSource={audioSource}
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          progress={selectedCard ? (progress.get(selectedCard.id) ?? null) : null}
        />
      ) : (
        <FlashcardDetailsSheet
          audioSource={audioSource}
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
      {showProgress && (
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
      )}
      {!showProgress && (
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
                router.dismissTo("/(tabs)/library");
                showSuccessToast("Deck deleted.");
              }
            });
          }}
        />
      )}
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
    count: { color: colors.textTertiary, fontSize: fontSize.footnote },
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
    search: { paddingHorizontal: sizes.spacing.content },
    title: { color: colors.textPrimary, ...textStyles.screenTitle },
  });
}
