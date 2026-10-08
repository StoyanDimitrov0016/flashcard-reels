/**
 * Experimental draft of a schema 5 deck, used only by the challenge lab.
 *
 * A deck teaches ideas. An idea is one statement worth knowing, and it owns the learning identity.
 * Challenges are different ways to probe that idea. `format` says how the learner answers, and
 * `level` says how much the challenge asks of them. The two are independent: a scenario can be a
 * choice question at the `apply` level, and a definition can be a flashcard at the `recall` level.
 *
 * The format also decides the kind the learner sees: a `flashcard` is recalled, revealed, and
 * rated; `true-false` and `choice` are quizzes, answered on the card and graded by the app.
 */
export type ChallengeLevel = "recognize" | "recall" | "apply";

type ChallengeBase = Readonly<{
  id: string;
  level: ChallengeLevel;
  prompt: string;
  /** Shown after answering. Required in the real format whenever a true-false answer is false. */
  explanation?: string;
}>;

type TrueFalseChallenge = ChallengeBase & Readonly<{ format: "true-false"; answer: boolean }>;

type ChoiceOption = Readonly<{
  /** Unique within its challenge only. Learner attempts record which option ids were picked. */
  id: string;
  text: string;
  correct: boolean;
  /** Why this option is right or wrong, shown when the learner picks it. */
  explanation?: string;
}>;

/** One correct option is "pick one"; several are "pick all that apply". Options are shuffled. */
export type ChoiceChallenge = ChallengeBase &
  Readonly<{ format: "choice"; options: readonly ChoiceOption[] }>;

/** Today's card: the learner recalls the answer, reveals it on the back, and rates themselves. */
type FlashcardChallenge = ChallengeBase & Readonly<{ format: "flashcard"; answer: string }>;

/**
 * A sentence with blanks, filled from a bank of words. The prompt is the sentence: `{{0}}`,
 * `{{1}}`, and so on mark the blanks, and `answers` holds the right word for each, in order.
 * The bank is the answers plus the distractors, shuffled.
 */
export type FillBlanksChallenge = ChallengeBase &
  Readonly<{
    format: "fill-blanks";
    answers: readonly string[];
    distractors: readonly string[];
  }>;

/** Two columns to pair up. The right column is shuffled; three to five pairs work best. */
export type MatchChallenge = ChallengeBase &
  Readonly<{
    format: "match";
    pairs: readonly Readonly<{ left: string; right: string }>[];
  }>;

export type Challenge =
  | TrueFalseChallenge
  | ChoiceChallenge
  | FillBlanksChallenge
  | MatchChallenge
  | FlashcardChallenge;

export type ChallengeKind = "flashcard" | "quiz";

export function challengeKind(challenge: Challenge): ChallengeKind {
  return challenge.format === "flashcard" ? "flashcard" : "quiz";
}

export type BankWord = Readonly<{ id: string; text: string }>;

/** The word bank of a fill-blanks challenge: answers are `a0`, `a1`, …; distractors `d0`, …. */
export function bankWords(challenge: FillBlanksChallenge): readonly BankWord[] {
  return [
    ...challenge.answers.map((text, index) => ({ id: `a${index}`, text })),
    ...challenge.distractors.map((text, index) => ({ id: `d${index}`, text })),
  ];
}

/**
 * Whether each blank holds a right word, judged by text so two identical words are
 * interchangeable. `placed` holds a bank word id, or null, per blank.
 */
export function blankResults(
  challenge: FillBlanksChallenge,
  placed: readonly (string | null)[]
): readonly boolean[] {
  const words = new Map(bankWords(challenge).map((word) => [word.id, word.text]));
  return challenge.answers.map((answer, index) => {
    const id = placed[index] ?? null;
    return id !== null && words.get(id) === answer;
  });
}

/** The ids a challenge shows in a shuffled order, if any. */
export function shuffledIds(challenge: Challenge): readonly string[] {
  switch (challenge.format) {
    case "choice":
      return challenge.options.map((option) => option.id);
    case "fill-blanks":
      return bankWords(challenge).map((word) => word.id);
    case "match":
      // Right-hand tiles; `r2` is the right side of the third pair.
      return challenge.pairs.map((_, index) => `r${index}`);
    case "true-false":
    case "flashcard":
      break;
  }
  return [];
}

export type Idea = Readonly<{
  id: string;
  /** A short name for lists and progress, such as "Bulkhead". */
  title: string;
  /** The idea itself. It introduces the idea and closes every challenge as the takeaway. */
  statement: string;
  /** The lesson follows from the section, because section IDs are unique across the deck. */
  sectionId: string | null;
  challenges: readonly Challenge[];
}>;

type IdeaDeckSection = Readonly<{ id: string; title: string }>;
type IdeaDeckLesson = Readonly<{
  id: string;
  title: string;
  sections: readonly IdeaDeckSection[];
}>;

export type IdeaDeck = Readonly<{
  schema: 5;
  id: string;
  authorId: string;
  revision: number;
  title: string;
  description: string;
  lessons: readonly IdeaDeckLesson[];
  ideas: readonly Idea[];
}>;

const levelRanks: Readonly<Record<ChallengeLevel, 1 | 2 | 3>> = {
  recognize: 1,
  recall: 2,
  apply: 3,
};

export function levelRank(level: ChallengeLevel): 1 | 2 | 3 {
  return levelRanks[level];
}
