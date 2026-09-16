import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ show: vi.fn(), hide: vi.fn() }));
vi.mock("react-native-toast-message", () => ({ default: toast }));
vi.mock("expo-symbols", () => ({ SymbolView: vi.fn() }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: vi.fn() }));
vi.mock("react-native", () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  Text: vi.fn(),
  View: vi.fn(),
}));
vi.mock("@/shared/presentation/theme", () => ({ useAppTheme: vi.fn() }));

import {
  hideFlashcardToast,
  showFocusedToast,
  showHoldToast,
  showSuccessToast,
} from "@/shared/presentation/flashcard-toast";

describe("shared toast ownership", () => {
  beforeEach(() => {
    showHoldToast();
    hideFlashcardToast();
    vi.clearAllMocks();
  });

  it("does not let hold cleanup dismiss a deck success message", () => {
    showSuccessToast("Deck installed.");
    hideFlashcardToast();
    expect(toast.hide).not.toHaveBeenCalled();
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ text1: "Deck installed.", visibilityTime: 2500 })
    );
  });

  it("still dismisses a hold hint", () => {
    showHoldToast();
    hideFlashcardToast();
    expect(toast.hide).toHaveBeenCalledOnce();
  });

  it("can dismiss focus feedback after replacing a success message", () => {
    showSuccessToast("Deck updated.");
    showFocusedToast();
    hideFlashcardToast();
    expect(toast.hide).toHaveBeenCalledOnce();
  });
});
