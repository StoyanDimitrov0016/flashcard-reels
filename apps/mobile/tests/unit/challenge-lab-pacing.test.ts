import { describe, expect, it } from "vitest";

import { levelRank } from "@/features/challenge-lab/domain/idea-deck";
import {
  chooseNext,
  createPacingState,
  markShown,
  recordOutcome,
  type FeedItem,
  type Outcome,
  type PacingState,
} from "@/features/challenge-lab/domain/pacing-composer";
import { interleavedSampleIdeas } from "@/features/challenge-lab/domain/sample-decks";

function seeded(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

/** Plays the feed, answering every challenge with the outcome `answer` returns. */
function play(steps: number, answer: (item: FeedItem, index: number) => Outcome) {
  const random = seeded(7);
  let state: PacingState = createPacingState();
  const items: FeedItem[] = [];
  for (let index = 0; index < steps; index += 1) {
    const item = chooseNext(interleavedSampleIdeas, state, random);
    if (!item) {
      throw new Error("The sample deck should never run out");
    }
    items.push(item);
    state = markShown(state, item);
    if (item.kind === "challenge") {
      state = recordOutcome(state, item, answer(item, index));
    }
  }
  return { items, state };
}

function rankOf(item: FeedItem): number {
  return item.kind === "intro" ? 0 : levelRank(item.challenge.level);
}

describe("challenge lab pacing", () => {
  it("opens with a new idea and never asks above recognize during the warm-up", () => {
    const { items } = play(3, () => "correct");

    expect(items[0]?.kind).toBe("intro");
    expect(items.every((item) => rankOf(item) <= 1)).toBe(true);
  });

  it("never shows the same idea twice in a row", () => {
    const { items } = play(60, (_, index) => (index % 5 === 0 ? "missed" : "correct"));

    for (let index = 1; index < items.length; index += 1) {
      expect(items[index]?.idea.id).not.toBe(items[index - 1]?.idea.id);
    }
  });

  it("reaches apply-level challenges for a learner who keeps answering correctly", () => {
    const { items, state } = play(40, () => "correct");

    expect(state.ceiling).toBe(3);
    expect(items.some((item) => rankOf(item) === 3)).toBe(true);
  });

  it("follows a miss with two recognize-level breathers", () => {
    const missAt = 12;
    const { items } = play(16, (_, index) => (index === missAt ? "missed" : "correct"));

    expect(items.slice(missAt + 1, missAt + 3).map((item) => rankOf(item) <= 1)).toEqual([
      true,
      true,
    ]);
  });

  it("brings a missed idea back as a second chance", () => {
    const { items } = play(30, (item) =>
      item.kind === "challenge" && item.idea.id === "idea-timeout" && rankOf(item) === 1
        ? "missed"
        : "correct"
    );

    expect(items.some((item) => item.phase === "second chance")).toBe(true);
  });

  it("introduces every idea for a learner who keeps going", () => {
    const { items } = play(200, () => "correct");
    const introduced = new Set(
      items.filter((item) => item.kind === "intro").map((item) => item.idea.id)
    );

    expect(introduced.size).toBe(interleavedSampleIdeas.length);
  });
});
