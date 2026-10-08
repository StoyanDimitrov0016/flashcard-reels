import type { Idea } from "@/features/challenge-lab/domain/idea-deck";
import type { Outcome } from "@/features/challenge-lab/domain/pacing-composer";
import type { ItemResponse } from "@/features/challenge-lab/presentation/challenge-lab-feed";
import type { Deck } from "@/features/decks/domain/deck.model";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { CardKindTag } from "@/features/challenge-lab/presentation/components/card-kind-tag";
import {
  QuizChallenge,
  type Quiz,
} from "@/features/challenge-lab/presentation/components/quiz-challenge";
import { GestureFooter } from "@/features/reels/presentation/components/gesture-footer";
import { CardPage } from "@/features/reels/presentation/components/reel-card";
import { ReelHeader } from "@/features/reels/presentation/components/reel-header";

type QuizReelCardProps = Readonly<{
  card: Flashcard;
  contentInsetTop: number;
  deck: Deck;
  deckCardCount: number;
  height: number;
  idea: Idea;
  onRespond: (response: ItemResponse) => void;
  optionOrder: readonly string[];
  outcome: Outcome | null;
  quiz: Quiz;
  response: ItemResponse | undefined;
  /** Stable per reel; picks the note's wording. */
  seed: string;
  theme: DeckThemeVariant;
  width: number;
}>;

/** A single-faced reel: the quiz is answerable as soon as it scrolls into view. */
export function QuizReelCard({
  card,
  contentInsetTop,
  deck,
  deckCardCount,
  height,
  idea,
  onRespond,
  optionOrder,
  outcome,
  quiz,
  response,
  seed,
  theme,
  width,
}: QuizReelCardProps) {
  return (
    <CardPage
      backgroundColor={theme.background}
      contentInsetTop={contentInsetTop}
      height={height}
      width={width}
    >
      <ReelHeader
        accessory={<CardKindTag kind="quiz" />}
        card={card}
        deck={deck}
        deckCardCount={deckCardCount}
        showMainFeedLink
        theme={theme}
      />
      <QuizChallenge
        idea={idea}
        onRespond={onRespond}
        optionOrder={optionOrder}
        outcome={outcome}
        quiz={quiz}
        response={response}
        seed={seed}
        theme={theme}
      />
      <GestureFooter showHoldHint={false} showRevealHint={false} />
    </CardPage>
  );
}
