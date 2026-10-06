/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  invalidateThemeSelections: vi.fn(),
  saveThemeSelection: vi.fn(async () => undefined),
}));
vi.mock("@/features/decks/presentation/dependencies/use-decks", () => ({
  useDecks: () => ({ deckService: { saveThemeSelection: harness.saveThemeSelection } }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("@/shared/presentation/query/query-scopes", () => ({
  invalidateChangedData: harness.invalidateThemeSelections,
}));

import type { DeckThemeId } from "@/features/decks/domain/deck-theme-selection.model";

import { useSaveDeckThemeSelection } from "@/features/decks/presentation/controllers/use-save-deck-theme-selection";
import { deckThemes } from "@/features/decks/presentation/deck-theme-presets";

const DECK_ID = "deck-1";
function requirePreset(index: number) {
  const preset = deckThemes[index];
  if (!preset) {
    throw new Error(`The test needs deck theme preset ${index}`);
  }
  return preset;
}
const current = requirePreset(0);
const chosen = requirePreset(1);

beforeEach(() => vi.clearAllMocks());

function renderSave(themeId: DeckThemeId | null) {
  return renderHook((shown) => useSaveDeckThemeSelection(shown), {
    initialProps: { deckId: DECK_ID, themeId },
  });
}

it("keeps the saved choice until the screen shows it, so the old theme never flashes", async () => {
  const mounted = renderSave(current.id);

  await act(async () => {
    await mounted.result.current.savePreset(DECK_ID, chosen);
  });

  // Saved, but the screen still shows the old theme while it reloads.
  expect(mounted.result.current.pendingPreset).toBe(chosen);
  expect(mounted.result.current.saving).toBe(false);
  expect(harness.invalidateThemeSelections).toHaveBeenCalledExactlyOnceWith({}, [
    "theme-selection",
  ]);

  mounted.rerender({ deckId: DECK_ID, themeId: chosen.id });

  expect(mounted.result.current.pendingPreset).toBeNull();
});

it("drops the choice when saving fails", async () => {
  harness.saveThemeSelection.mockRejectedValueOnce(new Error("disk full"));
  const mounted = renderSave(current.id);

  await act(async () => {
    await mounted.result.current.savePreset(DECK_ID, chosen);
  });

  expect(mounted.result.current.pendingPreset).toBeNull();
  expect(mounted.result.current.saveError).toBe("Could not save this theme. Please try again.");
});

it("shows no choice for another deck", async () => {
  const mounted = renderSave(current.id);
  await act(async () => {
    await mounted.result.current.savePreset(DECK_ID, chosen);
  });

  mounted.rerender({ deckId: "deck-2", themeId: current.id });

  expect(mounted.result.current.pendingPreset).toBeNull();
});
