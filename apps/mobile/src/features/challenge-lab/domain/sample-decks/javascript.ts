import type { IdeaDeck } from "../idea-deck";

export const javascriptDeck: IdeaDeck = {
  schema: 5,
  id: "deck-javascript",
  authorId: "author-lab",
  revision: 1,
  title: "JavaScript",
  description: "The language core behind everyday bugs",
  lessons: [
    {
      id: "lesson-js-core",
      title: "Language Core",
      sections: [
        { id: "section-closures", title: "Closures" },
        { id: "section-event-loop", title: "Event loop" },
        { id: "section-equality", title: "Equality" },
        { id: "section-promise-combinators", title: "Promise combinators" },
      ],
    },
  ],
  ideas: [
    {
      id: "idea-closure",
      title: "Closures",
      statement:
        "A closure is a function that keeps access to the variables of the scope it was created in, even after that scope has returned.",
      sectionId: "section-closures",
      challenges: [
        {
          id: "closure-tf",
          format: "true-false",
          level: "recognize",
          prompt: "A closure can read variables from a function that has already returned.",
          answer: true,
          explanation:
            "The inner function keeps its creating scope alive for as long as it exists.",
        },
        {
          id: "closure-captures",
          format: "choice",
          level: "recognize",
          prompt: "What does a closure capture?",
          options: [
            { id: "a", text: "The variables of the scope where it was created", correct: true },
            {
              id: "b",
              text: "The value of `this` at call time",
              correct: false,
              explanation: "`this` is decided per call. Closures capture variables, not `this`.",
            },
            { id: "c", text: "A copy of the global object", correct: false },
          ],
        },
        {
          id: "closure-loop",
          format: "choice",
          level: "apply",
          prompt: "`for (var i = 0; i < 3; i++) setTimeout(() => log(i))` logs what?",
          explanation:
            "`var` is function-scoped, so all three callbacks share one `i`, which is 3 when they run.",
          options: [
            { id: "a", text: "3, 3, 3", correct: true },
            {
              id: "b",
              text: "0, 1, 2",
              correct: false,
              explanation: "That's what `let` gives you: a fresh binding per iteration.",
            },
            { id: "c", text: "undefined three times", correct: false },
          ],
        },
        {
          id: "closure-uses",
          format: "choice",
          level: "apply",
          prompt: "Which of these rely on a closure?",
          options: [
            { id: "a", text: "A counter factory that returns `increment`", correct: true },
            {
              id: "b",
              text: "A click handler reading a variable from its enclosing function",
              correct: true,
            },
            {
              id: "c",
              text: "`Math.max(1, 2)`",
              correct: false,
              explanation: "It only uses its arguments; there's no enclosing state.",
            },
            { id: "d", text: "A memoize helper that keeps a cache between calls", correct: true },
          ],
        },
        {
          id: "closure-fill",
          format: "fill-blanks",
          level: "recall",
          prompt: "A closure keeps access to the {{0}} of the scope it was {{1}} in.",
          answers: ["variables", "created"],
          distractors: ["called", "copied"],
        },
        {
          id: "closure-recall",
          format: "flashcard",
          level: "recall",
          prompt: "What is a closure?",
          answer:
            "A function bundled with the variables of the scope it was created in, which it can still use after that scope returns.",
        },
      ],
    },
    {
      id: "idea-event-loop",
      title: "Microtasks first",
      statement:
        "Microtasks such as promise callbacks run before the next macrotask, so a resolved promise's `.then` runs before a `setTimeout(fn, 0)` callback.",
      sectionId: "section-event-loop",
      challenges: [
        {
          id: "loop-tf",
          format: "true-false",
          level: "recognize",
          prompt: "`setTimeout(fn, 0)` runs before an already-resolved promise's `.then` callback.",
          answer: false,
          explanation: "The microtask queue drains completely before the next timer gets a turn.",
        },
        {
          id: "loop-microtasks",
          format: "choice",
          level: "recognize",
          prompt: "Which callbacks are queued as microtasks?",
          options: [
            { id: "a", text: "`.then` callbacks", correct: true },
            { id: "b", text: "`queueMicrotask` callbacks", correct: true },
            {
              id: "c",
              text: "`setTimeout` callbacks",
              correct: false,
              explanation: "Timers are macrotasks; they wait for the microtask queue to empty.",
            },
            { id: "d", text: "Code after an `await`", correct: true },
          ],
        },
        {
          id: "loop-order",
          format: "choice",
          level: "apply",
          prompt:
            "`setTimeout(() => log('A')); Promise.resolve().then(() => log('B')); log('C');` logs?",
          explanation: "Synchronous code first, then microtasks, then the timer.",
          options: [
            { id: "a", text: "C, B, A", correct: true },
            { id: "b", text: "C, A, B", correct: false },
            { id: "c", text: "A, B, C", correct: false },
            { id: "d", text: "B, C, A", correct: false },
          ],
        },
        {
          id: "loop-fill",
          format: "fill-blanks",
          level: "recall",
          prompt: "Promise callbacks are {{0}}, so they run before the next {{1}} such as a timer.",
          answers: ["microtasks", "macrotask"],
          distractors: ["macrotasks", "render"],
        },
        {
          id: "loop-recall",
          format: "flashcard",
          level: "recall",
          prompt: "Why does a resolved promise's callback beat `setTimeout(fn, 0)`?",
          answer:
            "Promise callbacks are microtasks, and the event loop drains all microtasks before it runs the next macrotask such as a timer.",
        },
      ],
    },
    {
      id: "idea-equality",
      title: "Strict equality",
      statement:
        "`===` compares without type conversion, while `==` converts operands first, which is why `0 == ''` is true.",
      sectionId: "section-equality",
      challenges: [
        {
          id: "equality-null",
          format: "true-false",
          level: "recognize",
          prompt: "`null == undefined` is true.",
          answer: true,
          explanation:
            "`==` treats `null` and `undefined` as equal to each other and to nothing else.",
        },
        {
          id: "equality-nan",
          format: "true-false",
          level: "recognize",
          prompt: "`NaN === NaN` is true.",
          answer: false,
          explanation: "`NaN` equals nothing, itself included. Use `Number.isNaN` instead.",
        },
        {
          id: "equality-false-one",
          format: "choice",
          level: "recognize",
          prompt: "Which comparison is `false`?",
          options: [
            { id: "a", text: "`0 === ''`", correct: true },
            {
              id: "b",
              text: "`0 == ''`",
              correct: false,
              explanation: "`''` converts to `0`, so loose equality says true.",
            },
            { id: "c", text: "`'1' == 1`", correct: false },
            { id: "d", text: "`null == undefined`", correct: false },
          ],
        },
        {
          id: "equality-true-many",
          format: "choice",
          level: "apply",
          prompt: "Which expressions are `true`?",
          options: [
            { id: "a", text: "`[] == false`", correct: true },
            { id: "b", text: "`Object.is(NaN, NaN)`", correct: true },
            {
              id: "c",
              text: "`'2' === 2`",
              correct: false,
              explanation: "Strict equality never converts a string to a number.",
            },
            {
              id: "d",
              text: "`{} === {}`",
              correct: false,
              explanation: "Two object literals are two different objects.",
            },
          ],
        },
        {
          id: "equality-recall",
          format: "flashcard",
          level: "recall",
          prompt: "What is the difference between `==` and `===`?",
          answer:
            "`===` requires the same type and value. `==` converts the operands to a common type first, which allows surprises like `0 == ''`.",
        },
      ],
    },
    {
      id: "idea-promise-combinators",
      title: "all vs allSettled",
      statement:
        "`Promise.all` rejects as soon as any input rejects, while `Promise.allSettled` waits for every input and reports each outcome.",
      sectionId: "section-promise-combinators",
      challenges: [
        {
          id: "combinators-tf",
          format: "true-false",
          level: "recognize",
          prompt: "`Promise.all` waits for every promise to settle before it rejects.",
          answer: false,
          explanation:
            "It rejects with the first rejection; the other promises keep running unobserved.",
        },
        {
          id: "combinators-any",
          format: "choice",
          level: "recognize",
          prompt: "What does `Promise.any` resolve with?",
          options: [
            { id: "a", text: "The first fulfilled value", correct: true },
            {
              id: "b",
              text: "The first settled value",
              correct: false,
              explanation: "That's `Promise.race`, which also settles on a rejection.",
            },
            { id: "c", text: "An array of every value", correct: false },
          ],
        },
        {
          id: "combinators-match",
          format: "match",
          level: "recognize",
          prompt: "Match each method to when it settles",
          pairs: [
            { left: "`Promise.all`", right: "First rejection, or every input fulfilled" },
            { left: "`Promise.allSettled`", right: "Once every input settles" },
            { left: "`Promise.race`", right: "As soon as any input settles" },
            { left: "`Promise.any`", right: "First fulfillment" },
          ],
        },
        {
          id: "combinators-reject",
          format: "choice",
          level: "recall",
          prompt: "Which of these can reject?",
          options: [
            { id: "a", text: "`Promise.all`", correct: true },
            { id: "b", text: "`Promise.race`", correct: true },
            {
              id: "c",
              text: "`Promise.allSettled`",
              correct: false,
              explanation: "It reports rejections as results instead of rejecting.",
            },
            { id: "d", text: "`Promise.any`, once every input rejects", correct: true },
          ],
        },
        {
          id: "combinators-dashboard",
          format: "choice",
          level: "apply",
          prompt: "A dashboard loads five widgets and should show whichever succeed. Which fits?",
          options: [
            { id: "a", text: "`Promise.allSettled`", correct: true },
            {
              id: "b",
              text: "`Promise.all`",
              correct: false,
              explanation: "One failed widget would reject the whole batch.",
            },
            {
              id: "c",
              text: "`Promise.race`",
              correct: false,
              explanation: "It settles with the first widget and ignores the rest.",
            },
          ],
        },
      ],
    },
  ],
};
