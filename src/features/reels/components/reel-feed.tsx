import { useEffect, useRef, useState } from "react";
import { FlatList, type ListRenderItem, StyleSheet, View } from "react-native";

import { useDeckAppearances } from "@/features/decks/hooks/use-deck-appearances";
import { useDecks } from "@/features/decks/hooks/use-decks";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { ReelCard } from "@/features/reels/components/reel-card";
import { useRecallSession } from "@/features/reels/hooks/use-recall-session";
import { useReelFeed } from "@/features/reels/hooks/use-reel-feed";
import { useReelViewport } from "@/features/reels/hooks/use-reel-viewport";
import { FEED_ENGINE_CONFIG } from "@/features/reels/config/feed-engine";
import type { PreparedReelOccurrences } from "@/features/reels/services/reel-feed.service";
import { useAppServices } from "@/infrastructure/app-services";
import { palette } from "@/shared/presentation/palette";

type ReelFeedProps = Readonly<{
  baseCards: Flashcard[];
  cards: Flashcard[];
  initialReelPosition: number;
  recurrenceIds: ReadonlyMap<number, string>;
  showMainFeedLink?: boolean;
  sourceCards: Flashcard[];
  studySessionId: string;
}>;

export function ReelFeed({
  baseCards,
  cards,
  initialReelPosition,
  recurrenceIds,
  showMainFeedLink = false,
  sourceCards,
  studySessionId,
}: ReelFeedProps) {
  const [materializedBaseCards, setMaterializedBaseCards] = useState(baseCards);
  const [occurrences, setOccurrences] = useState<PreparedReelOccurrences>(() => ({
    cards,
    recurrenceIds,
  }));
  const displayCards = occurrences.cards;
  const { handleLayout, viewport } = useReelViewport();
  const { height, width } = viewport;
  const { activeIndex, handleMomentumScrollEnd: handleFeedMomentumScrollEnd } = useReelFeed({
    initialReelPosition,
    itemCount: displayCards.length,
    itemHeight: height,
  });
  const { attemptIds, rateCard, recallLevels, revealedPositions, setAttemptId, toggleCard } =
    useRecallSession();
  const { answerAudioService, reelFeedService, studyService } = useAppServices();
  const extensionInFlight = useRef(false);
  const startingAttemptPromises = useRef(new Map<number, Promise<string>>());
  const activeIndexReference = useRef(activeIndex);
  const activeCard = displayCards[activeIndex];
  const deckIds = [...new Set(displayCards.map((card) => card.deckId))];
  const { appearances } = useDeckAppearances(deckIds);
  const { decks } = useDecks(deckIds);

  useEffect(() => {
    activeIndexReference.current = activeIndex;
  }, [activeIndex]);

  const startAttemptForReel = (reelPosition: number, cardId: string): Promise<string> => {
    const existingAttemptId = attemptIds.get(reelPosition);
    if (existingAttemptId) {
      return Promise.resolve(existingAttemptId);
    }

    const existingStart = startingAttemptPromises.current.get(reelPosition);
    if (existingStart) {
      return existingStart;
    }

    const start = studyService
      .startAttempt(cardId, reelPosition, studySessionId)
      .then((attemptId) => {
        setAttemptId(reelPosition, attemptId);
        void studyService.finalizeAttemptsOutsideEditableWindow(
          studySessionId,
          activeIndexReference.current
        );
        return attemptId;
      });
    startingAttemptPromises.current.set(reelPosition, start);
    void start.finally(() => startingAttemptPromises.current.delete(reelPosition));
    return start;
  };

  useEffect(() => {
    if (!activeCard) {
      return undefined;
    }

    const existingAttemptId = attemptIds.get(activeIndex);
    if (existingAttemptId || startingAttemptPromises.current.has(activeIndex)) {
      return undefined;
    }

    const start = studyService
      .startAttempt(activeCard.id, activeIndex, studySessionId)
      .then((attemptId) => {
        setAttemptId(activeIndex, attemptId);
        void studyService.finalizeAttemptsOutsideEditableWindow(
          studySessionId,
          activeIndexReference.current
        );
        return attemptId;
      });
    startingAttemptPromises.current.set(activeIndex, start);
    void start.finally(() => startingAttemptPromises.current.delete(activeIndex));
    return undefined;
  }, [activeCard, activeIndex, attemptIds, setAttemptId, studyService, studySessionId]);

  useEffect(() => {
    void studyService.finalizeAttemptsOutsideEditableWindow(studySessionId, activeIndex);
  }, [activeIndex, studySessionId, studyService]);

  useEffect(() => {
    void studyService.updateSessionReelPosition(studySessionId, activeIndex);
  }, [activeIndex, studySessionId, studyService]);

  useEffect(() => {
    const recurrenceId = occurrences.recurrenceIds.get(activeIndex);
    if (recurrenceId) {
      void studyService.consumeRecurrence(recurrenceId);
    }
  }, [activeIndex, occurrences.recurrenceIds, studyService]);

  useEffect(() => {
    if (
      displayCards.length === 0 ||
      activeIndex < displayCards.length - FEED_ENGINE_CONFIG.extensionThreshold ||
      extensionInFlight.current
    ) {
      return;
    }

    extensionInFlight.current = true;
    void reelFeedService
      .extendFeed(sourceCards, studySessionId)
      .then((feed) => {
        setMaterializedBaseCards(feed.baseCards);
        setOccurrences({ cards: feed.cards, recurrenceIds: feed.recurrenceIds });
      })
      .finally(() => {
        extensionInFlight.current = false;
      });
  }, [activeIndex, displayCards.length, reelFeedService, sourceCards, studySessionId]);

  const getItemLayout = (_data: ArrayLike<Flashcard> | null | undefined, index: number) => ({
    index,
    length: height,
    offset: height * index,
  });
  const renderItem: ListRenderItem<Flashcard> = ({ item, index }) => {
    const appearance = appearances.get(item.deckId);
    const deck = decks.get(item.deckId);
    if (!appearance || !deck) {
      return null;
    }

    return (
      <ReelCard
        appearance={appearance}
        audioSource={answerAudioService.findSourceForFlashcard(item.id)}
        card={item}
        deck={deck}
        height={height}
        index={index}
        isActive={index === activeIndex}
        onFlip={() => toggleCard(index)}
        onRate={(level) => {
          void startAttemptForReel(index, item.id)
            .then((attemptId) => studyService.rateAttempt(attemptId, level))
            .then((updated) => {
              if (updated) {
                rateCard(index, level);
                return reelFeedService
                  .refreshOccurrences(materializedBaseCards, studySessionId)
                  .then(setOccurrences);
              }
              return undefined;
            });
        }}
        recallLevel={recallLevels.get(index) ?? null}
        revealed={revealedPositions.has(index)}
        showMainFeedLink={showMainFeedLink}
        total={displayCards.length}
        width={width}
      />
    );
  };

  return (
    <View onLayout={handleLayout} style={styles.feed}>
      {height > 0 && width > 0 && (
        <FlatList
          data={displayCards}
          decelerationRate="fast"
          extraData={{ activeIndex, recallLevels, revealedPositions }}
          getItemLayout={getItemLayout}
          initialScrollIndex={displayCards.length > 0 ? activeIndex : undefined}
          keyExtractor={(card, index) => `${card.id}-${index}`}
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
