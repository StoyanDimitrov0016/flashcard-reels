import { useEffect, useRef } from "react";
import { FlatList, type ListRenderItem, StyleSheet, View } from "react-native";

import { useDeckAppearances } from "@/features/decks/hooks/use-deck-appearances";
import { useDecks } from "@/features/decks/hooks/use-decks";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { ReelCard } from "@/features/reels/components/reel-card";
import { useRecallSession } from "@/features/reels/hooks/use-recall-session";
import { useReelFeed } from "@/features/reels/hooks/use-reel-feed";
import { useReelViewport } from "@/features/reels/hooks/use-reel-viewport";
import { useAppServices } from "@/infrastructure/app-services";
import { palette } from "@/shared/presentation/palette";

type ReelFeedProps = Readonly<{
  cards: Flashcard[];
  showMainFeedLink?: boolean;
  studySessionId: string;
}>;

export function ReelFeed({ cards, showMainFeedLink = false, studySessionId }: ReelFeedProps) {
  const { handleLayout, viewport } = useReelViewport();
  const { height, width } = viewport;
  const { activeIndex, handleMomentumScrollEnd: handleFeedMomentumScrollEnd } = useReelFeed({
    itemCount: cards.length,
    itemHeight: height,
  });
  const { attemptIds, rateCard, recallLevels, revealedCardIds, setAttemptId, toggleCard } =
    useRecallSession();
  const { answerAudioService, studyService } = useAppServices();
  const startingAttemptPromises = useRef(new Map<number, Promise<string>>());
  const activeIndexReference = useRef(activeIndex);
  const activeCard = cards[activeIndex];
  const deckIds = [...new Set(cards.map((card) => card.deckId))];
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
        void studyService.finalizeAttemptsOutsideEditableWindow(activeIndexReference.current);
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
        void studyService.finalizeAttemptsOutsideEditableWindow(activeIndexReference.current);
        return attemptId;
      });
    startingAttemptPromises.current.set(activeIndex, start);
    void start.finally(() => startingAttemptPromises.current.delete(activeIndex));
    return undefined;
  }, [activeCard, activeIndex, attemptIds, setAttemptId, studyService, studySessionId]);

  useEffect(() => {
    void studyService.finalizeAttemptsOutsideEditableWindow(activeIndex);
  }, [activeIndex, studyService]);

  useEffect(() => {
    void studyService.updateSessionPosition(studySessionId, activeIndex);
  }, [activeIndex, studySessionId, studyService]);

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
        onFlip={() => toggleCard(item.id)}
        onRate={(level) => {
          void startAttemptForReel(index, item.id)
            .then((attemptId) => studyService.rateAttempt(attemptId, level))
            .then((updated) => {
              if (updated) {
                rateCard(item.id, level);
              }
            });
        }}
        recallLevel={recallLevels.get(item.id) ?? null}
        revealed={revealedCardIds.has(item.id)}
        showMainFeedLink={showMainFeedLink}
        total={cards.length}
        width={width}
      />
    );
  };

  return (
    <View onLayout={handleLayout} style={styles.feed}>
      {height > 0 && width > 0 && (
        <FlatList
          data={cards}
          decelerationRate="fast"
          extraData={{ activeIndex, recallLevels, revealedCardIds }}
          getItemLayout={getItemLayout}
          keyExtractor={(card) => card.id}
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
