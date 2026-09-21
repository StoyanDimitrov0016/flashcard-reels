import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

import { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { StudySession } from "@/features/study/domain/study-session.model";

export const TEST_DECK_ID = "00000000-0000-4000-8000-000000000100";
export const OTHER_DECK_ID = "00000000-0000-4000-8000-000000000101";

export function testId(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

export function makeFlashcard(
  index: number,
  deckId: string = TEST_DECK_ID,
  order = index - 1
): Flashcard {
  return new Flashcard({
    active: true,
    answer: `Answer ${index}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    deckId,
    id: testId(index),
    order,
    question: `Question ${index}`,
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
}

export function makeSession(
  id: string,
  scope: "mixed" | "focused",
  deckId: string | null = scope === "focused" ? TEST_DECK_ID : null,
  currentReelPosition = 0,
  furthestReelPosition = currentReelPosition
): StudySession {
  return new StudySession({
    aggregatedThroughReelPosition: -1,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    currentReelPosition,
    deckId,
    feedState: "{}",
    furthestReelPosition,
    id,
    lastActiveAt: "2026-01-01T00:00:00.000Z",
    scope,
  });
}

export class TestClock implements Clock {
  private currentTime = Date.parse("2026-01-01T00:00:00.000Z");

  now(): string {
    this.currentTime += 1000;
    return new Date(this.currentTime).toISOString();
  }

  advance(milliseconds: number): void {
    this.currentTime += milliseconds;
  }
}

export class SequenceIdGenerator implements IdGenerator {
  private nextId = 1000;

  generate(): string {
    const id = testId(this.nextId);
    this.nextId += 1;
    return id;
  }
}
