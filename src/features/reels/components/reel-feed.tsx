import { useEffect } from "react";
import { FlatList, type ListRenderItem, StyleSheet, View } from "react-native";

import { useDeckAppearances } from "@/features/decks/hooks/use-deck-appearances";
import { useDecks } from "@/features/decks/hooks/use-decks";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { ReelCard } from "@/features/reels/components/reel-card";
import { useReelController } from "@/features/reels/hooks/use-reel-controller";
import { useReelFeed } from "@/features/reels/hooks/use-reel-feed";
import { useReelViewport } from "@/features/reels/hooks/use-reel-viewport";
import type {
  PreparedReelFeed,
  PreparedReelOccurrence,
} from "@/features/reels/services/reel-feed.service";
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
  const activeOccurrence = feed.occurrences[activeIndex];
  const deckIds = [...new Set(feed.occurrences.map(({ card }) => card.deckId))];
  const { appearances } = useDeckAppearances(deckIds);
  const { decks } = useDecks(deckIds);

  useEffect(() => {
    if (activeOccurrence) {
      onOccurrenceBecameActive(activeOccurrence);
    }
  }, [activeOccurrence, onOccurrenceBecameActive]);

  const getItemLayout = (
    _data: ArrayLike<PreparedReelOccurrence> | null | undefined,
    index: number
  ) => ({
    index,
    length: height,
    offset: height * index,
  });
  const renderItem: ListRenderItem<PreparedReelOccurrence> = ({ item, index }) => {
    const appearance = appearances.get(item.card.deckId);
    const deck = decks.get(item.card.deckId);
    if (!appearance || !deck) {
      return null;
    }

    return (
      <ReelCard
        appearance={appearance}
        audioSource={answerAudioService.findSourceForFlashcard(item.card.id)}
        card={item.card}
        deck={deck}
        height={height}
        index={item.reelPosition}
        isActive={index === activeIndex}
        onFlip={() => controller.toggleCard(item.reelPosition)}
        onRate={(level) => onRatingSelected(item, level)}
        recallLevel={controller.recallLevels.get(item.reelPosition) ?? null}
        revealed={controller.revealedPositions.has(item.reelPosition)}
        showMainFeedLink={showMainFeedLink}
        total={feed.materializedThroughReelPosition + 1}
        width={width}
      />
    );
  };

  return (
    <View onLayout={handleLayout} style={styles.feed}>
      {height > 0 && width > 0 && (
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
          keyExtractor={(occurrence) => occurrence.key}
          onMomentumScrollEnd={handleFeedMomentumScrollEnd}
          pagingEnabled
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ feed: { backgroundColor: palette.background, flex: 1 } });
