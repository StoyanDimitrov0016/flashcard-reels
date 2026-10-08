import type { Rating } from "@/features/learning-engine/domain/rating";

import {
  blankResults,
  type Challenge,
  type ChoiceChallenge,
  type Idea,
} from "@/features/challenge-lab/domain/idea-deck";
import {
  chooseNext,
  createPacingState,
  markShown,
  recordOutcome,
  type FeedItem,
  type Outcome,
  type PacingState,
} from "@/features/challenge-lab/domain/pacing-composer";

export type ItemResponse =
  | Readonly<{ format: "true-false"; picked: boolean }>
  | Readonly<{ format: "choice"; selected: readonly string[]; submitted: boolean }>
  | Readonly<{
      format: "fill-blanks";
      /** A bank word id, or null, for each blank. */
      placed: readonly (string | null)[];
      submitted: boolean;
    }>
  | Readonly<{
      format: "match";
      /** Indexes of the pairs found so far. */
      matched: readonly number[];
      mistakes: number;
    }>
  | Readonly<{ format: "flashcard"; rating: Rating }>;

/** A match with this many wrong pairs or fewer still counts as partly right. */
const PARTIAL_MATCH_MISTAKES = 2;

export type LabFeed = Readonly<{
  pacing: PacingState;
  /** Every shown item, then one pending item composed from the latest pacing state. */
  items: readonly FeedItem[];
  responses: Readonly<Record<string, ItemResponse>>;
}>;

export type LabFeedAction =
  | Readonly<{ type: "arrive"; index: number }>
  | Readonly<{ type: "respond"; key: string; response: ItemResponse }>
  | Readonly<{ type: "restart" }>;

export function createLabFeed(ideas: readonly Idea[]): LabFeed {
  const empty: LabFeed = { pacing: createPacingState(), items: [], responses: {} };
  const first = chooseNext(ideas, empty.pacing);
  if (!first) {
    return empty;
  }
  const pacing = markShown(empty.pacing, first);
  const pending = chooseNext(ideas, pacing);
  return { pacing, items: pending ? [first, pending] : [first], responses: {} };
}

export function reduceLabFeed(
  ideas: readonly Idea[],
  feed: LabFeed,
  action: LabFeedAction
): LabFeed {
  switch (action.type) {
    case "restart":
      return createLabFeed(ideas);
    case "arrive": {
      const arrived = feed.items[action.index];
      // Only reaching the pending item shows something new; going back changes nothing.
      if (!arrived || action.index !== feed.items.length - 1) {
        return feed;
      }
      const pacing = markShown(feed.pacing, arrived);
      const pending = chooseNext(ideas, pacing);
      return { ...feed, pacing, items: pending ? [...feed.items, pending] : feed.items };
    }
    case "respond": {
      const index = feed.items.findIndex((item) => item.key === action.key);
      const item = feed.items[index];
      if (!item || item.kind !== "challenge") {
        return feed;
      }
      const responses = { ...feed.responses, [action.key]: action.response };
      const outcome = scoreResponse(item.challenge, action.response);
      const alreadyScored = scoreResponse(item.challenge, feed.responses[action.key]) !== null;
      if (outcome === null || alreadyScored) {
        return { ...feed, responses };
      }
      const pacing = recordOutcome(feed.pacing, item, outcome);
      // The learner hasn't seen the pending item yet, so it can follow the new outcome.
      const pendingIndex = feed.items.length - 1;
      const pending = index === pendingIndex - 1 ? chooseNext(ideas, pacing) : null;
      return {
        pacing,
        responses,
        items: pending ? [...feed.items.slice(0, pendingIndex), pending] : feed.items,
      };
    }
  }
  return feed;
}

export function scoreResponse(
  challenge: Challenge,
  response: ItemResponse | undefined
): Outcome | null {
  if (!response) {
    return null;
  }
  switch (response.format) {
    case "true-false":
      return challenge.format === "true-false" && response.picked === challenge.answer
        ? "correct"
        : "missed";
    case "choice":
      return challenge.format === "choice" && response.submitted
        ? scoreChoice(challenge, response.selected)
        : null;
    case "fill-blanks": {
      if (challenge.format !== "fill-blanks" || !response.submitted) {
        return null;
      }
      const results = blankResults(challenge, response.placed);
      if (results.every(Boolean)) {
        return "correct";
      }
      return results.some(Boolean) ? "partial" : "missed";
    }
    case "match": {
      if (challenge.format !== "match" || response.matched.length < challenge.pairs.length) {
        return null;
      }
      if (response.mistakes === 0) {
        return "correct";
      }
      return response.mistakes <= PARTIAL_MATCH_MISTAKES ? "partial" : "missed";
    }
    case "flashcard":
      return ratingOutcomes[response.rating];
  }
  return null;
}

function scoreChoice(challenge: ChoiceChallenge, selected: readonly string[]): Outcome {
  const correct = new Set(
    challenge.options.filter((option) => option.correct).map((option) => option.id)
  );
  const pickedWrong = selected.some((id) => !correct.has(id));
  if (pickedWrong || selected.length === 0) {
    return "missed";
  }
  return selected.length === correct.size ? "correct" : "partial";
}

const ratingOutcomes: Readonly<Record<Rating, Outcome>> = {
  again: "missed",
  hard: "partial",
  good: "correct",
  easy: "correct",
};
