import { useEffect, useLayoutEffect, useRef } from "react";
import { FlatList, type ListRenderItem, StyleSheet, View } from "react-native";

import { useDeckAppearances } from "@/features/decks/presentation/hooks/use-deck-appearances";
import { useDecks } from "@/features/decks/presentation/hooks/use-decks";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { ReelCard } from "@/features/reels/presentation/components/reel-card";
import { useReelController } from "@/features/reels/presentation/hooks/use-reel-controller";
import { getLocalReelIndex, useReelFeed } from "@/features/reels/presentation/hooks/use-reel-feed";
import { useReelViewport } from "@/features/reels/presentation/hooks/use-reel-viewport";
import type { PreparedReelFeed, PreparedReelOccurrence } from "@/features/reels/domain/reel-feed";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { palette } from "@/shared/presentation/palette";

type ReelFeedProps = Readonly<{
  preparedFeed: PreparedReelFeed;
  showMainFeedLink?: boolean;
  sourceCards: Flashcard[];
}>;

export function ReelFeed({ preparedFeed, showMainFeedLink = false, sourceCards }: ReelFeedProps) {
  const controller = useReelController({ initialFeed: preparedFeed, sourceCards });
  const { answerAudioService, feed, onOccurrenceBecameActive, onRatingSelected } = controller;
  const { handleLayout, viewport } = useReelViewport();
  const feedListReference = useRef<FlatList<PreparedReelOccurrence>>(null);
  const loadedFromReference = useRef(feed.loadedFromReelPosition);
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
  const { appearances, loading: appearancesLoading } = useDeckAppearances(deckIds);
  const { decks, loading: decksLoading } = useDecks(deckIds);
  const cardCountsByDeckId = new Map<Flashcard["deckId"], number>();
  for (const card of sourceCards) {
    cardCountsByDeckId.set(card.deckId, (cardCountsByDeckId.get(card.deckId) ?? 0) + 1);
  }
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

  useLayoutEffect(() => {
    if (loadedFromReference.current === feed.loadedFromReelPosition) {
      return;
    }

    loadedFromReference.current = feed.loadedFromReelPosition;
    feedListReference.current?.scrollToIndex({
      animated: false,
      index: getLocalReelIndex(
        activeReelPosition,
        feed.loadedFromReelPosition,
        feed.occurrences.length
      ),
    });
  }, [activeReelPosition, feed.loadedFromReelPosition, feed.occurrences.length]);

  const getItemLayout = (
    _data: ArrayLike<PreparedReelOccurrence> | null | undefined,
    index: number
  ) => ({
    index,
    length: height,
    offset: height * index,
  });
  const renderItem: ListRenderItem<PreparedReelOccurrence> = ({ item }) => {
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
          item.card.id,
          deck.version
        )}
        card={item.card}
        deck={deck}
        deckCardCount={cardCountsByDeckId.get(item.card.deckId) ?? 1}
        height={height}
        isActive={item.reelPosition === activeReelPosition}
        onFlip={() => controller.toggleCard(item.reelPosition)}
        onRate={(level) => onRatingSelected(item, level)}
        recallLevel={controller.recallLevels.get(item.reelPosition) ?? null}
        revealed={controller.revealedPositions.has(item.reelPosition)}
        showMainFeedLink={showMainFeedLink}
        width={width}
      />
    );
  };

  return (
    <View onLayout={handleLayout} style={styles.feed}>
      {!metadataReady ? <LoadingState accessibilityLabel="Preparing cards" /> : null}
      {metadataReady && height > 0 && width > 0 ? (
        <FlatList
          data={feed.occurrences}
          decelerationRate="fast"
          extraData={{
            activeIndex,
            activeReelPosition,
            recallLevels: controller.recallLevels,
            revealedPositions: controller.revealedPositions,
          }}
          getItemLayout={getItemLayout}
          initialScrollIndex={feed.occurrences.length > 0 ? activeIndex : undefined}
          initialNumToRender={2}
          key={`reel-feed-${height}-${width}`}
          keyExtractor={(occurrence) => occurrence.key}
          maxToRenderPerBatch={3}
          onMomentumScrollEnd={handleFeedMomentumScrollEnd}
          pagingEnabled
          ref={feedListReference}
          removeClippedSubviews
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={32}
          windowSize={3}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { backgroundColor: palette.background, flex: 1 },
});
