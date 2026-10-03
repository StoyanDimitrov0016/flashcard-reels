import { describe, expect, it } from "vitest";

import { matchesLessonSearch } from "@/features/lessons/presentation/lesson-search";

describe("lesson search", () => {
  const lesson = { title: "Caching and Invalidation" };

  it("matches a lesson by any part of its title, ignoring case and spaces", () => {
    expect(matchesLessonSearch(lesson, "cach")).toBe(true);
    expect(matchesLessonSearch(lesson, "  INVALIDATION ")).toBe(true);
    expect(matchesLessonSearch(lesson, "sharding")).toBe(false);
  });

  it("keeps every lesson for an empty search", () => {
    expect(matchesLessonSearch(lesson, "   ")).toBe(true);
  });
});
