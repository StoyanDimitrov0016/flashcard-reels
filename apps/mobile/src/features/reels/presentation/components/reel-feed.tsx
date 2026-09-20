import { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList, type FlashListRef, type ListRenderItem } from "@shopify/flash-list";

import { useDeckAppearances } from "@/features/decks/presentation/controllers/use-deck-appearances";
import { useDeckCollection } from "@/features/decks/presentation/controllers/use-deck-collection";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { ReelCard } from "@/features/reels/presentation/components/reel-card";
import { getFirstEditableReelPosition } from "@/features/reels/application/reel-extension-policy";
import { useReelController } from "@/features/reels/presentation/controllers/use-reel-controller";
import { useReelFeed } from "@/features/reels/presentation/hooks/use-reel-feed";
import { useReelViewport } from "@/features/reels/presentation/hooks/use-reel-viewport";
import type { PreparedReelFeed, PreparedReelOccurrence } from "@/features/reels/domain/reel-feed";
import type { FocusedCardState } from "@/features/reels/presentation/open-focused-feed";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type ReelFeedProps = Readonly<{
  preparedFeed: PreparedReelFeed;
  showMainFeedLink?: boolean;
  sourceCards: Flashcard[];
  initialCardState?: FocusedCardState;
}>;

export function ReelFeed({
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
    answerAudioService,
    extensionError,
    fatalError,
    feed,
    onOccurrenceBecameActive,
    onRatingSelected,
    refreshError,
    requestFeedExtension,
    recallLevels,
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
  const { appearances, loading: appearancesLoading } = useDeckAppearances(deckIds);
  const { decks, loading: decksLoading } = useDeckCollection(deckIds);
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
        ratingEnabled={item.reelPosition >= getFirstEditableReelPosition(feed.furthestReelPosition)}
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
  };
  const extraData = {
    activeIndex,
    activeReelPosition,
    furthestReelPosition: feed.furthestReelPosition,
    recallLevels,
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
      {!!refreshError && (
        <Text accessibilityRole="alert" style={styles.refreshNotice}>
          The feed could not be refreshed. Your saved rating is still recorded.
        </Text>
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
      gap: 8,
      padding: 12,
    },
    feed: { backgroundColor: colors.canvas, flex: 1 },
    noticeText: { color: colors.textSecondary, textAlign: "center" },
    refreshNotice: { color: colors.textSecondary, padding: 8, textAlign: "center" },
    retryLabel: { color: colors.actionPrimary, fontWeight: "700" },
  });
}
