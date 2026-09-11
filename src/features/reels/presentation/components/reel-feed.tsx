import { useEffect, useRef } from "react";
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
  const { answerAudioService, feed, onOccurrenceBecameActive, onRatingSelected } = controller;
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
          deck.version,
          item.card.id,
          "answer"
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
        <FlashList
          data={feed.occurrences}
          decelerationRate="fast"
          extraData={{
            activeIndex,
            activeReelPosition,
            recallLevels: controller.recallLevels,
            revealedPositions: controller.revealedPositions,
          }}
          initialScrollIndex={feed.occurrences.length > 0 ? activeIndex : undefined}
          key={`reel-feed-${height}-${width}`}
          keyExtractor={(occurrence) => occurrence.key}
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
