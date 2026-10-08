import type { FeedItem, Outcome } from "@/features/challenge-lab/domain/pacing-composer";
import type { ItemResponse } from "@/features/challenge-lab/presentation/challenge-lab-feed";
import type { Deck } from "@/features/decks/domain/deck.model";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { FlashcardReelCard } from "@/features/challenge-lab/presentation/components/flashcard-reel-card";
import { QuizReelCard } from "@/features/challenge-lab/presentation/components/quiz-reel-card";

type ChallengeReelCardProps = Readonly<{
  /** The flashcard and deck the production header reads its label from. */
  card: Flashcard;
  contentInsetTop: number;
  deck: Deck;
  deckCardCount: number;
  height: number;
  item: FeedItem;
  onRespond: (response: ItemResponse) => void;
  outcome: Outcome | null;
  response: ItemResponse | undefined;
  theme: DeckThemeVariant;
  width: number;
}>;

/** One reel: a new idea or a flashcard to turn over, or a quiz to answer in place. */
export function ChallengeReelCard({
  item,
  onRespond,
  outcome,
  response,
  ...card
}: ChallengeReelCardProps) {
  if (item.kind === "intro") {
    return (
      <FlashcardReelCard
        {...card}
        answer={item.idea.statement}
        onRate={null}
        question={item.idea.title}
        rating={null}
        tag="idea"
      />
    );
  }

  const { challenge } = item;
  if (challenge.format === "flashcard") {
    return (
      <FlashcardReelCard
        {...card}
        answer={challenge.answer}
        onRate={(rating) => onRespond({ format: "flashcard", rating })}
        question={challenge.prompt}
        rating={response?.format === "flashcard" ? response.rating : null}
        tag="flashcard"
      />
    );
  }

  return (
    <QuizReelCard
      {...card}
      idea={item.idea}
      onRespond={onRespond}
      optionOrder={item.optionOrder}
      outcome={outcome}
      quiz={challenge}
      response={response}
      seed={item.key}
    />
  );
}
