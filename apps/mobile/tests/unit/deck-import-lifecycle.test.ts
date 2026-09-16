import { beforeEach, describe, expect, it, vi } from "vitest";

// Exercise hook-owned async operations with state/ref doubles, without native rendering.
const harness = vi.hoisted(() => ({
  state: undefined as unknown,
  cleanup: undefined as (() => void) | undefined,
  download: vi.fn(),
  install: vi.fn(),
  remove: vi.fn(),
  pick: vi.fn(),
  invalidate: vi.fn(),
  report: vi.fn(),
}));
vi.mock("react", () => ({
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => () => void) => {
    harness.cleanup = effect();
  },
  useState: (initial: unknown) => {
    harness.state = initial;
    return [
      initial,
      (next: unknown) => {
        harness.state = typeof next === "function" ? next(harness.state) : next;
      },
    ];
  },
}));
vi.mock("@/infrastructure/app-services", () => ({
  useAppServices: () => ({
    deckInstaller: { installFromFile: harness.install },
    deckPackageDownloader: { download: harness.download, remove: harness.remove },
    deckPackagePicker: { pick: harness.pick },
  }),
}));
vi.mock("@/features/decks/presentation/context/deck-content-context", () => ({
  useInvalidateDeckContent: () => harness.invalidate,
}));
vi.mock("@/shared/presentation/errors/report-error", () => ({ reportError: harness.report }));

import { useImportDeckPackage } from "@/features/decks/presentation/hooks/use-import-deck-package";

describe("deck import cancellation and feedback lifetime", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    harness.cleanup = undefined;
    harness.download.mockResolvedValue({ uri: "file:///cache/deck.fcrdeck" });
    harness.install.mockResolvedValue({ deckId: "deck", status: "installed", version: 1 });
  });

  it("installs completed downloads, invalidates content and cleans the temporary file", async () => {
    const hook = useImportDeckPackage();
    await expect(hook.importFromUrl("https://example.com/deck")).resolves.toMatchObject({
      status: "installed",
    });
    expect(harness.invalidate).toHaveBeenCalledOnce();
    expect(harness.remove).toHaveBeenCalledOnce();
    expect(harness.state).toMatchObject({ error: null, importing: false, downloading: false });
  });

  it("does not install or report intentional cancellation as an error", async () => {
    harness.download.mockImplementation(
      (_url: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );
    const hook = useImportDeckPackage();
    const result = hook.importFromUrl("https://example.com/deck");
    hook.cancelDownload();
    await expect(result).resolves.toBeNull();
    expect(harness.install).not.toHaveBeenCalled();
    expect(harness.report).not.toHaveBeenCalled();
    expect(harness.state).toMatchObject({ error: null, importing: false });
  });

  it("cleans a late download completion after cancellation without installing it", async () => {
    let resolveDownload: ((file: { uri: string }) => void) | undefined;
    harness.download.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDownload = resolve;
        })
    );
    const hook = useImportDeckPackage();
    const result = hook.importFromUrl("https://example.com/deck");
    hook.cancelDownload();
    resolveDownload?.({ uri: "file:///cache/deck.fcrdeck" });
    await expect(result).resolves.toBeNull();
    expect(harness.install).not.toHaveBeenCalled();
    expect(harness.remove).toHaveBeenCalledOnce();
  });

  it("prevents overlapping imports", async () => {
    let resolveDownload: ((file: { uri: string }) => void) | undefined;
    harness.download.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDownload = resolve;
        })
    );
    const hook = useImportDeckPackage();
    const first = hook.importFromUrl("https://example.com/deck");
    await expect(hook.importFromUrl("https://example.com/other")).resolves.toBeNull();
    expect(harness.download).toHaveBeenCalledOnce();
    resolveDownload?.({ uri: "file:///cache/deck.fcrdeck" });
    await first;
  });

  it("cancels an owned download on unmount", async () => {
    harness.download.mockImplementation(
      (_url: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );
    const hook = useImportDeckPackage();
    const result = hook.importFromUrl("https://example.com/deck");
    harness.cleanup?.();
    await expect(result).resolves.toBeNull();
    expect(harness.install).not.toHaveBeenCalled();
  });

  it("clears failed-import feedback when dismissed or retried", async () => {
    harness.download.mockRejectedValue(new Error("offline"));
    const hook = useImportDeckPackage();
    await hook.importFromUrl("https://example.com/deck");
    expect(harness.state).toMatchObject({ error: { code: "DECK_OPERATION_FAILED" } });
    hook.clearImportError();
    expect(harness.state).toMatchObject({ error: null });
  });

  it("does not cancel installation once the download is complete", async () => {
    let finishInstall:
      | ((result: { deckId: string; status: string; version: number }) => void)
      | undefined;
    harness.install.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishInstall = resolve;
        })
    );
    const hook = useImportDeckPackage();
    const result = hook.importFromUrl("https://example.com/deck");
    await Promise.resolve();
    expect(harness.state).toMatchObject({ downloading: false, importing: true });
    hook.cancelDownload();
    finishInstall?.({ deckId: "deck", status: "installed", version: 1 });
    await expect(result).resolves.toMatchObject({ status: "installed" });
  });

  it("ignores a file-picker result delivered after unmount", async () => {
    let finishPicker: ((selection: { uri: string }) => void) | undefined;
    harness.pick.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPicker = resolve;
        })
    );
    const hook = useImportDeckPackage();
    const result = hook.importFromDevice();
    const lastMountedState = harness.state;
    harness.cleanup?.();
    finishPicker?.({ uri: "file:///documents/deck.fcrdeck" });
    await expect(result).resolves.toBeNull();
    expect(harness.install).not.toHaveBeenCalled();
    expect(harness.remove).not.toHaveBeenCalled();
    expect(harness.state).toBe(lastMountedState);
  });

  it("finishes an atomic installation after unmount without publishing stale success", async () => {
    let finishInstall:
      | ((result: { deckId: string; status: string; version: number }) => void)
      | undefined;
    harness.install.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishInstall = resolve;
        })
    );
    const hook = useImportDeckPackage();
    const result = hook.importFromUrl("https://example.com/deck");
    await Promise.resolve();
    const lastMountedState = harness.state;
    harness.cleanup?.();
    finishInstall?.({ deckId: "deck", status: "installed", version: 1 });
    await expect(result).resolves.toBeNull();
    expect(harness.invalidate).toHaveBeenCalledOnce();
    expect(harness.remove).toHaveBeenCalledOnce();
    expect(harness.state).toBe(lastMountedState);
  });
});
