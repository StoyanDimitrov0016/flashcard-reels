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

type ReelFeedProps = Readonly<{ cards: Flashcard[]; showMainFeedLink?: boolean }>;

export function ReelFeed({ cards, showMainFeedLink = false }: ReelFeedProps) {
  const { handleLayout, viewport } = useReelViewport();
  const { height, width } = viewport;
  const { activeIndex, handleMomentumScrollEnd } = useReelFeed({
    itemCount: cards.length,
    itemHeight: height,
  });
  const { rateCard, recallLevels, revealedCardIds, toggleCard } = useRecallSession();
  const { answerAudioService, studyService } = useAppServices();
  const deckIds = [...new Set(cards.map((card) => card.deckId))];
  const { appearances } = useDeckAppearances(deckIds);
  const { decks } = useDecks(deckIds);
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
          rateCard(item.id, level);
          void studyService.recordReview(item.id, level);
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
          onMomentumScrollEnd={handleMomentumScrollEnd}
          pagingEnabled
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ feed: { backgroundColor: palette.background, flex: 1 } });
