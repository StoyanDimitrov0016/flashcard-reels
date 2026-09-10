import {
  rememberCard,
  type FeedCandidate,
  type FeedChoice,
  type FeedComposer,
  type FeedComposerInput,
} from "../domain/feed-composer";

export type RandomSource = () => number;

const MEMORY_PRESSURE_RETRIEVABILITY = 0.8;

export class SimpleFeedComposer implements FeedComposer {
  private readonly random: RandomSource;

  constructor(random: RandomSource = Math.random) {
    this.random = random;
  }

  chooseNext(input: FeedComposerInput): FeedChoice | null {
    if (input.candidates.length === 0) {
      return null;
    }

    const availableCandidates = input.candidates.filter(
      (candidate) => !candidate.isReservedForImmediateRecurrence
    );
    const candidates = availableCandidates.length > 0 ? availableCandidates : input.candidates;
    const recentIds = new Set(input.state.recentCardIds);
    const groups = groupCandidates(candidates);

    for (const group of groups) {
      const preferred = group.filter((candidate) => !recentIds.has(candidate.card.id));
      const choice = this.chooseFromGroup(preferred);
      if (choice) {
        return { candidate: choice, state: rememberCard(input.state, choice.card.id) };
      }
    }

    for (const group of groups) {
      const choice = this.chooseFromGroup(group);
      if (choice) {
        return { candidate: choice, state: rememberCard(input.state, choice.card.id) };
      }
    }

    return null;
  }

  private chooseFromGroup(group: readonly FeedCandidate[]): FeedCandidate | null {
    if (group.length === 0) {
      return null;
    }
    const shuffled = [...group];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(clampRandom(this.random()) * (index + 1));
      const current = shuffled[index];
      const swap = shuffled[swapIndex];
      if (current && swap) {
        shuffled[index] = swap;
        shuffled[swapIndex] = current;
      }
    }
    return shuffled[0] ?? null;
  }
}

function groupCandidates(candidates: readonly FeedCandidate[]): FeedCandidate[][] {
  const pressure: FeedCandidate[] = [];
  const newCards: FeedCandidate[] = [];
  const lowPressure: FeedCandidate[] = [];

  for (const candidate of candidates) {
    if (candidate.isNew) {
      newCards.push(candidate);
    } else if (
      candidate.isDue ||
      (candidate.retrievability !== null &&
        candidate.retrievability <= MEMORY_PRESSURE_RETRIEVABILITY)
    ) {
      pressure.push(candidate);
    } else {
      lowPressure.push(candidate);
    }
  }

  return [pressure, newCards, lowPressure];
}

function clampRandom(value: number): number {
  return Math.min(0.999999999, Math.max(0, value));
}
