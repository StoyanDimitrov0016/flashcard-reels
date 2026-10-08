import type { Challenge, Idea } from "@/features/challenge-lab/domain/idea-deck";
import type { Outcome } from "@/features/challenge-lab/domain/pacing-composer";
import type { ItemResponse } from "@/features/challenge-lab/presentation/challenge-lab-feed";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";

import { ChoiceQuiz } from "@/features/challenge-lab/presentation/components/choice-quiz";
import { FillBlanksQuiz } from "@/features/challenge-lab/presentation/components/fill-blanks-quiz";
import { MatchQuiz } from "@/features/challenge-lab/presentation/components/match-quiz";

/** A challenge answered on the card and graded by the app. */
export type Quiz = Exclude<Challenge, { format: "flashcard" }>;

type QuizChallengeProps = Readonly<{
  idea: Idea;
  onRespond: (response: ItemResponse) => void;
  optionOrder: readonly string[];
  outcome: Outcome | null;
  quiz: Quiz;
  response: ItemResponse | undefined;
  seed: string;
  theme: DeckThemeVariant;
}>;

/** The body of a quiz card. Each format answers differently inside the same layout and panel. */
export function QuizChallenge({ quiz, ...shared }: QuizChallengeProps) {
  switch (quiz.format) {
    case "fill-blanks":
      return <FillBlanksQuiz challenge={quiz} {...shared} />;
    case "match":
      return <MatchQuiz challenge={quiz} {...shared} />;
    case "true-false":
    case "choice":
      break;
  }
  return <ChoiceQuiz challenge={quiz} {...shared} />;
}
