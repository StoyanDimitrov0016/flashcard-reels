import { describe, expect, it } from "vitest";

import { calculateRecurrenceTarget } from "@/features/study/domain/recurrences";

describe("recurrence target calculation", () => {
  it.each(["again", "hard"] as const)("keeps a %s recurrence after its source", (rating) => {
    expect(calculateRecurrenceTarget(10, rating, () => 0)).toBeGreaterThan(10);
    expect(calculateRecurrenceTarget(10, rating, () => 0.999_999)).toBeGreaterThan(10);
  });
});
