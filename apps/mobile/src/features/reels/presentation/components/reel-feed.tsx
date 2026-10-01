import { FlashList, type FlashListRef, type ListRenderItem } from "@shopify/flash-list";
import { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { PreparedReelFeed, PreparedReelOccurrence } from "@/features/reels/domain/reel-feed";
import type { FocusedCardState } from "@/features/reels/presentation/open-focused-feed";

import { useDeckCollection } from "@/features/decks/presentation/controllers/use-deck-collection";
import { useDeckThemeSelections } from "@/features/decks/presentation/controllers/use-deck-theme-selections";
import { ReelCard } from "@/features/reels/presentation/components/reel-card";
import { useReelController } from "@/features/reels/presentation/controllers/use-reel-controller";
import { useReelFeed } from "@/features/reels/presentation/hooks/use-reel-feed";
import { useReelViewport } from "@/features/reels/presentation/hooks/use-reel-viewport";
import { getFirstEditableReelPosition } from "@/features/study/domain/review-attempts";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { showErrorToast } from "@/shared/presentation/flashcard-toast";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontWeight } from "@/shared/presentation/typography";

type ReelFeedProps = Readonly<{
  /** Space at the top of each card that overlaid chrome, such as the study feed header, uses. */
  contentInsetTop?: number;
  preparedFeed: PreparedReelFeed;
  showMainFeedLink?: boolean;
  sourceCards: Flashcard[];
  initialCardState?: FocusedCardState;
}>;

export function ReelFeed({
  contentInsetTop = 0,
  initialCardState,
  preparedFeed,
  showMainFeedLink = false,
  sourceCards,
}: ReelFeedProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const controller = useReelController({
    initialCardState,
    initialFeed: preparedFeed,
    sourceCards,
  });
  const {
    extensionError,
    fatalError,
    feed,
    onOccurrenceBecameActive,
    onRatingSelected,
    refreshError,
    requestFeedExtension,
    ratings,
    revealedPositions,
    retryFeedExtension,
    toggleCard,
  } = controller;
  const { handleLayout, viewport } = useReelViewport();
  const feedListReference = useRef<FlashListRef<PreparedReelOccurrence>>(null);
  const { height, width } = viewport;
  const {
    activeIndex,
    activeReelPosition,
    handleMomentumScrollEnd: handleFeedMomentumScrollEnd,
  } = useReelFeed({
    initialReelPosition: feed.currentReelPosition,
    itemCount: feed.occurrences.length,
    itemHeight: height,
    loadedFromReelPosition: feed.loadedFromReelPosition,
  });
  const activeOccurrenceReelPosition = feed.occurrences.some(
    (occurrence) => occurrence.reelPosition === activeReelPosition
  )
    ? activeReelPosition
    : undefined;
  const deckIds = [...new Set(sourceCards.map((card) => card.deckId))];
  const { themeSelections, loading: themeSelectionsLoading } = useDeckThemeSelections(deckIds);
  const { decks, loading: decksLoading } = useDeckCollection(deckIds);
  const cardCountsByDeckId = new Map<Flashcard["deckId"], number>();
  for (const card of sourceCards) {
    cardCountsByDeckId.set(card.deckId, (cardCountsByDeckId.get(card.deckId) ?? 0) + 1);
  }

  const metadataReady =
    !themeSelectionsLoading &&
    !decksLoading &&
    deckIds.every((deckId) => themeSelections.has(deckId) && decks.has(deckId));

  useEffect(
    function announceRefreshFailure() {
      if (refreshError) {
        showErrorToast("The feed couldn’t refresh. Your rating is saved.");
      }
    },
    [refreshError]
  );

  useEffect(
    function synchronizeActiveOccurrence() {
      if (activeOccurrenceReelPosition !== undefined) {
        onOccurrenceBecameActive(activeOccurrenceReelPosition);
      }
    },
    [activeOccurrenceReelPosition, onOccurrenceBecameActive]
  );

  const renderItem: ListRenderItem<PreparedReelOccurrence> = ({ item }) => {
    const themeSelection = themeSelections.get(item.card.deckId);
    const deck = decks.get(item.card.deckId);
    if (!themeSelection || !deck) {
      return null;
    }

    return (
      <ReelCard
        themeSelection={themeSelection}
        card={item.card}
        contentInsetTop={contentInsetTop}
        deck={deck}
        deckCardCount={cardCountsByDeckId.get(item.card.deckId) ?? 1}
        height={height}
        ratingEnabled={item.reelPosition >= getFirstEditableReelPosition(feed.furthestReelPosition)}
        isActive={item.reelPosition === activeReelPosition}
        onFlip={() => toggleCard(item.reelPosition)}
        onRate={(rating) => onRatingSelected(item, rating)}
        rating={ratings.get(item.reelPosition) ?? null}
        revealed={revealedPositions.has(item.reelPosition)}
        occurrenceKey={item.key}
        reelPosition={item.reelPosition}
        showMainFeedLink={showMainFeedLink}
        width={width}
      />
    );
  };
  const extraData = {
    activeIndex,
    activeReelPosition,
    furthestReelPosition: feed.furthestReelPosition,
    ratings,
    revealedPositions,
  };
  const handleEndReached = useCallback(() => {
    void requestFeedExtension().catch(() => undefined);
  }, [requestFeedExtension]);
  const keyExtractor = useCallback((occurrence: PreparedReelOccurrence) => occurrence.key, []);
  if (fatalError) {
    throw fatalError;
  }

  return (
    <View onLayout={handleLayout} style={styles.feed}>
      {!!extensionError && (
        <View style={styles.extensionNotice}>
          <Text accessibilityRole="alert" style={styles.noticeText}>
            More cards could not be loaded.
          </Text>
          <Pressable accessibilityRole="button" onPress={retryFeedExtension}>
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      )}
      {!metadataReady && <LoadingState accessibilityLabel="Preparing cards" />}
      {metadataReady && height > 0 && width > 0 && (
        <FlashList
          data={feed.occurrences}
          decelerationRate="fast"
          extraData={extraData}
          initialScrollIndex={feed.occurrences.length > 0 ? activeIndex : undefined}
          key={`reel-feed-${height}-${width}`}
          keyExtractor={keyExtractor}
          maintainVisibleContentPosition={{ disabled: false }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={1}
          onMomentumScrollEnd={handleFeedMomentumScrollEnd}
          pagingEnabled
          ref={feedListReference}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    extensionNotice: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      gap: sizes.spacing.medium,
      padding: sizes.spacing.xLarge,
    },
    feed: { backgroundColor: colors.canvas, flex: 1 },
    noticeText: { color: colors.textSecondary, textAlign: "center" },
    retryLabel: { color: colors.actionPrimary, fontWeight: fontWeight.bold },
  });
}
