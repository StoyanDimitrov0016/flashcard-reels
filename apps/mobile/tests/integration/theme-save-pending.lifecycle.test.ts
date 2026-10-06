/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  invalidateThemeSelections: vi.fn(),
  saveThemeSelection: vi.fn(async () => undefined),
}));
vi.mock("@/features/decks/presentation/dependencies/use-decks", () => ({
  useDecks: () => ({ deckService: { saveThemeSelection: harness.saveThemeSelection } }),
}));
vi.mock("@/shared/presentation/query/query-scopes", () => ({
  invalidateChangedData: harness.invalidateThemeSelections,
}));

import type { DeckThemeId } from "@/features/decks/domain/deck-theme-selection.model";

import { useSaveDeckThemeSelection } from "@/features/decks/presentation/controllers/use-save-deck-theme-selection";
import { deckThemes } from "@/features/decks/presentation/deck-theme-presets";

import { createQueryWrapper } from "../support/query-client";

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
    wrapper: createQueryWrapper(),
  });
}

it("keeps the saved choice until the screen shows it, so the old theme never flashes", async () => {
  const mounted = renderSave(current.id);

  act(() => mounted.result.current.savePreset(DECK_ID, chosen));
  await waitFor(() => expect(harness.invalidateThemeSelections).toHaveBeenCalledOnce());
  await waitFor(() => expect(mounted.result.current.saving).toBe(false));

  // Saved and reloaded, but the screen still shows the old theme until it renders the new one.
  expect(mounted.result.current.pendingPreset).toBe(chosen);
  expect(harness.invalidateThemeSelections).toHaveBeenCalledWith(expect.anything(), [
    "theme-selection",
  ]);

  mounted.rerender({ deckId: DECK_ID, themeId: chosen.id });

  expect(mounted.result.current.pendingPreset).toBeNull();
});

it("drops the choice when saving fails", async () => {
  harness.saveThemeSelection.mockRejectedValueOnce(new Error("disk full"));
  const mounted = renderSave(current.id);

  act(() => mounted.result.current.savePreset(DECK_ID, chosen));

  await waitFor(() =>
    expect(mounted.result.current.saveError).toBe("Could not save this theme. Please try again.")
  );
  expect(mounted.result.current.pendingPreset).toBeNull();
});

it("shows no choice for another deck", async () => {
  const mounted = renderSave(current.id);
  act(() => mounted.result.current.savePreset(DECK_ID, chosen));
  await waitFor(() => expect(mounted.result.current.saving).toBe(false));

  mounted.rerender({ deckId: "deck-2", themeId: current.id });

  expect(mounted.result.current.pendingPreset).toBeNull();
});
