import { challengeKind, levelRank, shuffledIds, type Challenge, type Idea } from "./idea-deck";

/**
 * Experimental feed composer for the challenge lab. It paces difficulty in waves, the way a game
 * paces tension: a short warm-up, easy wins, a climb to a peak, and a breather after every miss.
 * State lives in memory only; nothing here touches FSRS or learner data.
 */

export type Outcome = "correct" | "partial" | "missed";
type Rank = 1 | 2 | 3;
type PacingPhase =
  | "warm-up"
  | "easy win"
  | "ramp"
  | "peak"
  | "relief"
  | "new idea"
  | "second chance";

const WARM_UP_ITEMS = 3;
/** Target level per step after the warm-up: easy, easy, harder, harder, hardest, repeat. */
const WAVE: readonly Rank[] = [1, 1, 2, 2, 3];
const RELIEF_ITEMS = 2;
const STREAK_TO_RAISE_CEILING = 3;
const SECOND_CHANCE_GAP = 3;
const NEW_IDEA_GAP = 4;
/** An idea comes back only after at least one other item. */
const SAME_IDEA_GAP = 2;
const RECENT_CHALLENGE_LIMIT = 6;
const HISTORY_LIMIT = 24;
const OBJECTIVE_FORMAT_SHARE = 0.75;

type IdeaProgress = Readonly<{
  /** Highest level answered correctly. 0 means introduced but not yet shown to be known. */
  demonstrated: 0 | Rank;
  lastShownStep: number;
  missedAtStep: number | null;
}>;

type PacingHistoryEntry = Readonly<{
  key: string;
  /** 0 is an idea introduction. */
  rank: 0 | Rank;
  outcome: Outcome | null;
}>;

export type PacingState = Readonly<{
  /** Items shown so far. */
  step: number;
  ideas: Readonly<Record<string, IdeaProgress>>;
  streak: number;
  /** The hardest level the feed may ask for now. A streak raises it; a miss lowers it. */
  ceiling: Rank;
  reliefLeft: number;
  lastNewIdeaStep: number;
  recentChallengeIds: readonly string[];
  history: readonly PacingHistoryEntry[];
}>;

type FeedItemBase = Readonly<{
  key: string;
  idea: Idea;
  phase: PacingPhase;
}>;

type IntroItem = FeedItemBase & Readonly<{ kind: "intro" }>;
export type ChallengeItem = FeedItemBase &
  Readonly<{
    kind: "challenge";
    challenge: Challenge;
    /** Choice options, bank words, or right-hand match tiles, shuffled once when composed. */
    optionOrder: readonly string[];
  }>;
export type FeedItem = IntroItem | ChallengeItem;

export type RandomSource = () => number;

export function createPacingState(): PacingState {
  return {
    step: 0,
    ideas: {},
    streak: 0,
    ceiling: 2,
    reliefLeft: 0,
    lastNewIdeaStep: -NEW_IDEA_GAP,
    recentChallengeIds: [],
    history: [],
  };
}

type PacingTarget = Readonly<{ rank: Rank; phase: PacingPhase }>;

function pacingTarget(state: PacingState): PacingTarget {
  if (state.step < WARM_UP_ITEMS) {
    return { rank: 1, phase: "warm-up" };
  }
  if (state.reliefLeft > 0) {
    return { rank: 1, phase: "relief" };
  }
  const wave = WAVE[(state.step - WARM_UP_ITEMS) % WAVE.length] ?? 1;
  const rank = toRank(Math.min(wave, state.ceiling));
  if (wave === 1) {
    return { rank, phase: "easy win" };
  }
  return { rank, phase: rank === 3 ? "peak" : "ramp" };
}

/** Chooses the next item without changing state, so a pending item can be recomposed. */
export function chooseNext(
  allIdeas: readonly Idea[],
  state: PacingState,
  random: RandomSource = Math.random
): FeedItem | null {
  const ideas = allIdeas.filter((idea) => idea.challenges.length > 0);
  if (ideas.length === 0) {
    return null;
  }
  const target = pacingTarget(state);

  const secondChance = ideas.find((idea) => {
    const progress = state.ideas[idea.id];
    const missedAtStep = progress?.missedAtStep ?? null;
    return (
      progress !== undefined &&
      missedAtStep !== null &&
      state.step - missedAtStep >= SECOND_CHANCE_GAP &&
      state.step - progress.lastShownStep >= SAME_IDEA_GAP
    );
  });
  if (secondChance) {
    const progress = state.ideas[secondChance.id];
    return challengeItem(
      state,
      secondChance,
      toRank(Math.min(target.rank, nextRankFor(progress))),
      "second chance",
      random
    );
  }

  // A missed idea waits for its second chance, so a struggling learner isn't drilled on it.
  const ready = ideas.filter((idea) => {
    const progress = state.ideas[idea.id];
    return (
      progress !== undefined &&
      progress.missedAtStep === null &&
      state.step - progress.lastShownStep >= SAME_IDEA_GAP
    );
  });
  const newIdeaDue = target.rank === 1 && state.step - state.lastNewIdeaStep >= NEW_IDEA_GAP;
  const firstUnseen = ideas.find((idea) => state.ideas[idea.id] === undefined);
  if (firstUnseen && (ready.length === 0 || newIdeaDue)) {
    return {
      kind: "intro",
      key: `${state.step}:intro:${firstUnseen.id}`,
      idea: firstUnseen,
      phase: "new idea",
    };
  }

  const pool =
    ready.length > 0
      ? ready
      : ideas.filter(
          (idea) =>
            state.ideas[idea.id] !== undefined &&
            state.ideas[idea.id]?.lastShownStep !== state.step - 1
        );
  const ranked = pool.map((idea) => {
    const progress = state.ideas[idea.id];
    const rank = toRank(Math.min(target.rank, nextRankFor(progress)));
    return {
      idea,
      rank,
      mismatch: target.rank - rank,
      reviewing: (progress?.demonstrated ?? 0) >= rank ? 1 : 0,
      lastShownStep: progress?.lastShownStep ?? -1,
    };
  });
  // Normally the feed pushes an idea forward; during relief it serves something already known.
  const reviewPreference = target.phase === "relief" ? -1 : 1;
  ranked.sort(
    (left, right) =>
      left.mismatch - right.mismatch ||
      (left.reviewing - right.reviewing) * reviewPreference ||
      left.lastShownStep - right.lastShownStep
  );
  // Picking between the two best keeps the order from feeling scripted.
  const choice = ranked[Math.min(ranked.length - 1, Math.floor(clamp(random()) * 2))];
  if (!choice) {
    return null;
  }

  return challengeItem(state, choice.idea, choice.rank, target.phase, random);
}

export function markShown(state: PacingState, item: FeedItem): PacingState {
  const previous = state.ideas[item.idea.id];
  const progress: IdeaProgress = {
    demonstrated: previous?.demonstrated ?? 0,
    lastShownStep: state.step,
    missedAtStep: previous?.missedAtStep ?? null,
  };
  const isIntro = item.kind === "intro";
  const entry: PacingHistoryEntry = {
    key: item.key,
    rank: isIntro ? 0 : levelRank(item.challenge.level),
    outcome: null,
  };

  return {
    ...state,
    step: state.step + 1,
    ideas: { ...state.ideas, [item.idea.id]: progress },
    reliefLeft: isIntro ? state.reliefLeft : Math.max(0, state.reliefLeft - 1),
    lastNewIdeaStep: isIntro ? state.step : state.lastNewIdeaStep,
    recentChallengeIds: isIntro
      ? state.recentChallengeIds
      : [...state.recentChallengeIds, item.challenge.id].slice(-RECENT_CHALLENGE_LIMIT),
    history: [...state.history, entry].slice(-HISTORY_LIMIT),
  };
}

export function recordOutcome(
  state: PacingState,
  item: ChallengeItem,
  outcome: Outcome
): PacingState {
  const rank = levelRank(item.challenge.level);
  const previous = state.ideas[item.idea.id];
  const demonstrated = previous?.demonstrated ?? 0;
  const lastShownStep = previous?.lastShownStep ?? state.step;
  let progress: IdeaProgress = {
    lastShownStep,
    demonstrated,
    missedAtStep: previous?.missedAtStep ?? null,
  };

  let { ceiling, reliefLeft, streak } = state;
  if (outcome === "missed") {
    progress = {
      lastShownStep,
      demonstrated:
        Math.min(demonstrated, rank - 1) === 0 ? 0 : toRank(Math.min(demonstrated, rank - 1)),
      missedAtStep: state.step,
    };
    streak = 0;
    ceiling = toRank(ceiling - 1);
    reliefLeft = RELIEF_ITEMS;
  } else if (outcome === "correct") {
    progress = {
      lastShownStep,
      demonstrated: toRank(Math.max(demonstrated, rank)),
      missedAtStep: null,
    };
    streak += 1;
    if (streak >= STREAK_TO_RAISE_CEILING && ceiling < 3) {
      ceiling = toRank(ceiling + 1);
      streak = 0;
    }
  }

  return {
    ...state,
    ideas: { ...state.ideas, [item.idea.id]: progress },
    streak,
    ceiling,
    reliefLeft,
    history: state.history.map((entry) => (entry.key === item.key ? { ...entry, outcome } : entry)),
  };
}

/** Clamps a level number into 1–3. */
function toRank(value: number): Rank {
  if (value <= 1) {
    return 1;
  }
  return value === 2 ? 2 : 3;
}

function nextRankFor(progress: IdeaProgress | undefined): Rank {
  return toRank((progress?.demonstrated ?? 0) + 1);
}

function challengeItem(
  state: PacingState,
  idea: Idea,
  rank: Rank,
  phase: PacingPhase,
  random: RandomSource
): ChallengeItem | null {
  const challenge = pickChallenge(idea, rank, state.recentChallengeIds, random);
  if (!challenge) {
    return null;
  }
  return {
    kind: "challenge",
    key: `${state.step}:${challenge.id}`,
    idea,
    challenge,
    phase,
    optionOrder: shuffle(shuffledIds(challenge), random),
  };
}

/** Prefers the requested level, then easier levels, then harder ones, and avoids recent repeats. */
function pickChallenge(
  idea: Idea,
  rank: Rank,
  recentChallengeIds: readonly string[],
  random: RandomSource
): Challenge | null {
  const recent = new Set(recentChallengeIds);
  const byDistance = [rank, rank - 1, rank - 2, rank + 1, rank + 2];
  for (const wanted of byDistance) {
    const atLevel = idea.challenges.filter((challenge) => levelRank(challenge.level) === wanted);
    const fresh = atLevel.filter((challenge) => !recent.has(challenge.id));
    const candidates = fresh.length > 0 ? fresh : atLevel;
    // Quizzes are cheaper to start than a flashcard recall, so they win most ties.
    const objective = candidates.filter((challenge) => challengeKind(challenge) === "quiz");
    const options =
      objective.length > 0 && clamp(random()) < OBJECTIVE_FORMAT_SHARE ? objective : candidates;
    const picked = options[Math.floor(clamp(random()) * options.length)];
    if (picked) {
      return picked;
    }
  }
  return null;
}

function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clamp(random()) * (index + 1));
    const current = shuffled[index];
    const swap = shuffled[swapIndex];
    if (current !== undefined && swap !== undefined) {
      shuffled[index] = swap;
      shuffled[swapIndex] = current;
    }
  }
  return shuffled;
}

function clamp(value: number): number {
  return Math.min(0.999999999, Math.max(0, value));
}
