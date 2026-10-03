/** @vitest-environment jsdom */
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ params: {} as Record<string, unknown> }));
vi.mock("expo-router", () => ({ useLocalSearchParams: () => route.params }));

import { useDeckRouteId } from "@/features/decks/presentation/hooks/use-deck-route-id";
import { useLessonRouteId } from "@/features/lessons/presentation/hooks/use-lesson-route-id";

afterEach(cleanup);
describe("route ids", () => {
  it.each([undefined, "", "invalid", ["00000000-0000-4000-8000-000000000100"]])(
    "rejects invalid deck parameters: %s",
    (deckId) => {
      route.params = { deckId };
      expect(renderHook(useDeckRouteId).result.current).toBeNull();
    }
  );
  it("accepts a deck UUID", () => {
    const deckId = "00000000-0000-4000-8000-000000000100";
    route.params = { deckId };
    expect(renderHook(useDeckRouteId).result.current).toBe(deckId);
  });
  it.each([undefined, "", ["lesson"]])("rejects invalid lesson parameters: %s", (lessonId) => {
    route.params = { lessonId };
    expect(renderHook(useLessonRouteId).result.current).toBeNull();
  });
  it("keeps non-empty lesson IDs without imposing UUID syntax", () => {
    route.params = { lessonId: "intro" };
    expect(renderHook(useLessonRouteId).result.current).toBe("intro");
  });
});
