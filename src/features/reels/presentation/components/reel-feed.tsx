import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList, type FlashListRef, type ListRenderItem } from "@shopify/flash-list";

import { useDeckAppearances } from "@/features/decks/presentation/hooks/use-deck-appearances";
import { useDecks } from "@/features/decks/presentation/hooks/use-decks";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { ReelCard } from "@/features/reels/presentation/components/reel-card";
import { useReelController } from "@/features/reels/presentation/hooks/use-reel-controller";
import { useReelFeed } from "@/features/reels/presentation/hooks/use-reel-feed";
import { useReelViewport } from "@/features/reels/presentation/hooks/use-reel-viewport";
import type { PreparedReelFeed, PreparedReelOccurrence } from "@/features/reels/domain/reel-feed";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type ReelFeedProps = Readonly<{
  preparedFeed: PreparedReelFeed;
  showMainFeedLink?: boolean;
  sourceCards: Flashcard[];
}>;

export function ReelFeed({ preparedFeed, showMainFeedLink = false, sourceCards }: ReelFeedProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const controller = useReelController({ initialFeed: preparedFeed, sourceCards });
  const {
    answerAudioService,
    feed,
    onOccurrenceBecameActive,
    onRatingSelected,
    requestFeedExtension,
    recallLevels,
    revealedPositions,
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
  const deckIds = useMemo(
    () => [...new Set(sourceCards.map((card) => card.deckId))],
    [sourceCards]
  );
  const { appearances, loading: appearancesLoading } = useDeckAppearances(deckIds);
  const { decks, loading: decksLoading } = useDecks(deckIds);
  const cardCountsByDeckId = useMemo(() => {
    const counts = new Map<Flashcard["deckId"], number>();
    for (const card of sourceCards) {
      counts.set(card.deckId, (counts.get(card.deckId) ?? 0) + 1);
    }
    return counts;
  }, [sourceCards]);
  const metadataReady =
    !appearancesLoading &&
    !decksLoading &&
    deckIds.every((deckId) => appearances.has(deckId) && decks.has(deckId));

  useEffect(
    function synchronizeActiveOccurrence() {
      if (activeOccurrenceReelPosition !== undefined) {
        onOccurrenceBecameActive(activeOccurrenceReelPosition);
      }
    },
    [activeOccurrenceReelPosition, onOccurrenceBecameActive]
  );

  const renderItem = useCallback<ListRenderItem<PreparedReelOccurrence>>(
    ({ item }) => {
      const appearance = appearances.get(item.card.deckId);
      const deck = decks.get(item.card.deckId);
      if (!appearance || !deck) {
        return null;
      }

      return (
        <ReelCard
          appearance={appearance}
          audioSource={answerAudioService.findSourceForFlashcard(
            item.card.deckId,
            deck.version,
            item.card.id,
            "answer"
          )}
          card={item.card}
          deck={deck}
          deckCardCount={cardCountsByDeckId.get(item.card.deckId) ?? 1}
          height={height}
          isActive={item.reelPosition === activeReelPosition}
          onFlip={() => toggleCard(item.reelPosition)}
          onRate={(level) => onRatingSelected(item, level)}
          recallLevel={recallLevels.get(item.reelPosition) ?? null}
          revealed={revealedPositions.has(item.reelPosition)}
          occurrenceKey={item.key}
          reelPosition={item.reelPosition}
          showMainFeedLink={showMainFeedLink}
          width={width}
        />
      );
    },
    [
      answerAudioService,
      appearances,
      activeReelPosition,
      cardCountsByDeckId,
      decks,
      height,
      onRatingSelected,
      recallLevels,
      revealedPositions,
      showMainFeedLink,
      toggleCard,
      width,
    ]
  );
  const extraData = useMemo(
    () => ({ activeIndex, activeReelPosition, recallLevels, revealedPositions }),
    [activeIndex, activeReelPosition, recallLevels, revealedPositions]
  );
  const handleEndReached = useCallback(() => {
    void requestFeedExtension().catch(() => undefined);
  }, [requestFeedExtension]);
  const keyExtractor = useCallback((occurrence: PreparedReelOccurrence) => occurrence.key, []);

  return (
    <View onLayout={handleLayout} style={styles.feed}>
      {!metadataReady ? <LoadingState accessibilityLabel="Preparing cards" /> : null}
      {metadataReady && height > 0 && width > 0 ? (
        <FlashList
          data={feed.occurrences}
          decelerationRate="fast"
          extraData={extraData}
          initialScrollIndex={feed.occurrences.length > 0 ? activeIndex : undefined}
          key={`reel-feed-${height}-${width}`}
          keyExtractor={keyExtractor}
          onEndReached={handleEndReached}
          onEndReachedThreshold={1}
          onMomentumScrollEnd={handleFeedMomentumScrollEnd}
          pagingEnabled
          ref={feedListReference}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    feed: { backgroundColor: colors.background, flex: 1 },
  });
}
