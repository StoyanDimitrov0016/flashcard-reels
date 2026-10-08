import type { Challenge, Idea } from "@/features/challenge-lab/domain/idea-deck";
import type { Outcome } from "@/features/challenge-lab/domain/pacing-composer";
import type { ItemResponse } from "@/features/challenge-lab/presentation/challenge-lab-feed";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";

import {
  ChallengeOptionList,
  type ChallengeOption,
  type OptionListKind,
} from "@/features/challenge-lab/presentation/components/challenge-option-list";
import { ChallengePanel } from "@/features/challenge-lab/presentation/components/challenge-panel";
import { CheckButton } from "@/features/challenge-lab/presentation/components/check-button";
import {
  QuizLayout,
  QuizPrompt,
} from "@/features/challenge-lab/presentation/components/quiz-layout";

type ChoiceChallengeData = Extract<Challenge, { format: "true-false" | "choice" }>;

const noOptionIds: readonly string[] = [];

type ChoiceQuizProps = Readonly<{
  challenge: ChoiceChallengeData;
  idea: Idea;
  onRespond: (response: ItemResponse) => void;
  optionOrder: readonly string[];
  outcome: Outcome | null;
  response: ItemResponse | undefined;
  seed: string;
  theme: DeckThemeVariant;
}>;

/** True or false, pick one, or pick all that apply. */
export function ChoiceQuiz({
  challenge,
  idea,
  onRespond,
  optionOrder,
  outcome,
  response,
  seed,
  theme,
}: ChoiceQuizProps) {
  const answer = describeAnswer(challenge, optionOrder, response, outcome);
  const answered = outcome !== null;

  const toggle = (optionId: string) => {
    if (challenge.format === "true-false") {
      onRespond({ format: "true-false", picked: optionId === "true" });
    } else if (answer.kind === "single") {
      onRespond({ format: "choice", selected: [optionId], submitted: true });
    } else {
      const draft = answer.draft.includes(optionId)
        ? answer.draft.filter((id) => id !== optionId)
        : [...answer.draft, optionId];
      onRespond({ format: "choice", selected: draft, submitted: false });
    }
  };

  return (
    <QuizLayout
      hint={answer.kind === "multiple" ? "Select all that apply" : undefined}
      prompt={<QuizPrompt text={challenge.prompt} theme={theme} />}
      theme={theme}
    >
      <ChallengePanel
        answers={
          <>
            <ChallengeOptionList
              kind={answer.kind}
              onToggle={toggle}
              options={answer.options}
              selected={answered ? answer.selected : answer.draft}
              submitted={answered}
              theme={theme}
            />
            {answer.kind === "multiple" && (
              <CheckButton
                enabled={answer.draft.length > 0}
                hidden={answered}
                onPress={() =>
                  onRespond({ format: "choice", selected: answer.draft, submitted: true })
                }
                theme={theme}
              />
            )}
          </>
        }
        explanation={answer.explanation}
        explanationCandidates={answer.explanationCandidates}
        idea={idea}
        outcome={outcome}
        seed={seed}
        theme={theme}
      />
    </QuizLayout>
  );
}

type AnswerModel = Readonly<{
  draft: readonly string[];
  explanation: string | null;
  explanationCandidates: readonly string[];
  kind: OptionListKind;
  options: readonly ChallengeOption[];
  selected: readonly string[];
}>;

/** Turns a challenge and the learner's response into what the panel shows. */
function describeAnswer(
  challenge: ChoiceChallengeData,
  optionOrder: readonly string[],
  response: ItemResponse | undefined,
  outcome: Outcome | null
): AnswerModel {
  if (challenge.format === "true-false") {
    const picked = response?.format === "true-false" ? response.picked : null;
    return {
      draft: noOptionIds,
      explanation: challenge.explanation ?? null,
      explanationCandidates: challenge.explanation ? [challenge.explanation] : [],
      kind: "binary",
      options: [
        { id: "true", text: "True", correct: challenge.answer },
        { id: "false", text: "False", correct: !challenge.answer },
      ],
      selected: picked === null ? noOptionIds : [picked ? "true" : "false"],
    };
  }

  const choice = response?.format === "choice" ? response : null;
  const picked = choice?.selected ?? noOptionIds;
  const wrongPick = challenge.options.find(
    (option) => !option.correct && picked.includes(option.id) && option.explanation
  );
  const explanationCandidates = [
    ...new Set(
      [challenge.explanation, ...challenge.options.map((option) => option.explanation)].filter(
        (text): text is string => text !== undefined
      )
    ),
  ];
  return {
    draft: choice && !choice.submitted ? picked : noOptionIds,
    explanation:
      outcome !== "correct" && wrongPick?.explanation
        ? wrongPick.explanation
        : (challenge.explanation ?? null),
    explanationCandidates,
    kind: challenge.options.filter((option) => option.correct).length > 1 ? "multiple" : "single",
    options: optionOrder.flatMap((id) => challenge.options.filter((option) => option.id === id)),
    selected: choice?.submitted ? picked : noOptionIds,
  };
}
