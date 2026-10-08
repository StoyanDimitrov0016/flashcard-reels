import { describe, expect, it } from "vitest";

import type { Challenge } from "@/features/challenge-lab/domain/idea-deck";

import { scoreResponse } from "@/features/challenge-lab/presentation/challenge-lab-feed";

const fillBlanks: Challenge = {
  id: "fill",
  format: "fill-blanks",
  level: "recall",
  prompt: "Retries wait longer ({{0}}) and add randomness ({{1}}).",
  answers: ["backoff", "jitter"],
  distractors: ["timeouts", "jitter"],
};

const match: Challenge = {
  id: "match",
  format: "match",
  level: "recognize",
  prompt: "Match each state to what it does",
  pairs: [
    { left: "Closed", right: "Calls go through" },
    { left: "Open", right: "Calls fail fast" },
    { left: "Half-open", right: "Trial calls" },
  ],
};

describe("challenge lab grading", () => {
  it("grades filled blanks only once they are checked", () => {
    expect(
      scoreResponse(fillBlanks, { format: "fill-blanks", placed: ["a0", "a1"], submitted: false })
    ).toBeNull();
    expect(
      scoreResponse(fillBlanks, { format: "fill-blanks", placed: ["a0", "a1"], submitted: true })
    ).toBe("correct");
  });

  it("accepts an identical distractor word in a blank, since it reads the same", () => {
    expect(
      scoreResponse(fillBlanks, { format: "fill-blanks", placed: ["a0", "d1"], submitted: true })
    ).toBe("correct");
  });

  it("gives partial credit when only some blanks are right", () => {
    expect(
      scoreResponse(fillBlanks, { format: "fill-blanks", placed: ["a0", "d0"], submitted: true })
    ).toBe("partial");
    expect(
      scoreResponse(fillBlanks, { format: "fill-blanks", placed: ["d0", "a0"], submitted: true })
    ).toBe("missed");
  });

  it("grades a match once every pair is found, by how many wrong pairs were tried", () => {
    expect(scoreResponse(match, { format: "match", matched: [0, 1], mistakes: 0 })).toBeNull();
    expect(scoreResponse(match, { format: "match", matched: [0, 1, 2], mistakes: 0 })).toBe(
      "correct"
    );
    expect(scoreResponse(match, { format: "match", matched: [2, 0, 1], mistakes: 2 })).toBe(
      "partial"
    );
    expect(scoreResponse(match, { format: "match", matched: [0, 1, 2], mistakes: 3 })).toBe(
      "missed"
    );
  });
});
