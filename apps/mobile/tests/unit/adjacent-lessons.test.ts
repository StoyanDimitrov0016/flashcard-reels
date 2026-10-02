import { describe, expect, it } from "vitest";

import { findAdjacentLessons } from "@/features/lessons/presentation/adjacent-lessons";

const lessons = [
  { id: "a", order: 0, title: "Basics" },
  { id: "b", order: 1, title: "Caching" },
  { id: "c", order: 2, title: "Sharding" },
];

describe("adjacent lessons", () => {
  it("finds the lessons before and after a lesson", () => {
    expect(findAdjacentLessons(lessons, "b")).toEqual({ previous: lessons[0], next: lessons[2] });
  });

  it("has no previous lesson at the start and no next lesson at the end", () => {
    expect(findAdjacentLessons(lessons, "a").previous).toBeUndefined();
    expect(findAdjacentLessons(lessons, "c").next).toBeUndefined();
  });

  it("has neither for a lesson that is not in the list", () => {
    expect(findAdjacentLessons(lessons, "z")).toEqual({ previous: undefined, next: undefined });
  });
});
