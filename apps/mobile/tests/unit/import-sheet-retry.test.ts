/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-camera", () => ({
  useCameraPermissions: () => [{ granted: true }, vi.fn(), vi.fn()],
}));
vi.mock("expo-router", () => ({ useIsFocused: () => true }));
vi.mock("react-native", () => ({
  AppState: { currentState: "active", addEventListener: () => ({ remove: vi.fn() }) },
  Linking: {},
}));
vi.mock("@/shared/errors/report-error", () => ({ reportError: vi.fn() }));

import { useImportDeckSheet } from "@/features/decks/presentation/controllers/use-import-deck-sheet";
afterEach(cleanup);

describe("QR import retry", () => {
  it("offers another scan for an expired link", async () => {
    const onScan = vi.fn().mockResolvedValue(false);
    const hook = renderHook(() =>
      useImportDeckSheet({
        onScan,
        onClose: vi.fn(),
        onBrowse: async () => false,
        onClearError: vi.fn(),
        visible: true,
        canRetryDownload: false,
      })
    );
    act(() => hook.result.current.beginScanning());
    act(() =>
      hook.result.current.scanner.onBarcode?.({
        data: "https://example.com/t/expired",
        type: "qr",
        bounds: { origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        cornerPoints: [],
      })
    );
    await waitFor(() => expect(hook.result.current.scanner.paused).toBe(true));
    expect(hook.result.current.scanner.retryLabel).toBe("Scan again");
    act(() => hook.result.current.scanner.onRetry());
    expect(onScan).toHaveBeenCalledOnce();
    expect(hook.result.current.scanner.paused).toBe(false);
  });
  it("retries a transient failure with the last scanned URL", async () => {
    const url = "https://example.com/t/transfer";
    const onScan = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const onClose = vi.fn();
    const hook = renderHook(() =>
      useImportDeckSheet({
        onScan,
        onClose,
        onBrowse: async () => false,
        onClearError: vi.fn(),
        visible: true,
        canRetryDownload: true,
      })
    );
    act(() => hook.result.current.beginScanning());
    act(() =>
      hook.result.current.scanner.onBarcode?.({
        data: url,
        type: "qr",
        bounds: { origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        cornerPoints: [],
      })
    );
    await waitFor(() => expect(hook.result.current.scanner.paused).toBe(true));
    expect(hook.result.current.scanner.retryLabel).toBe("Try again");
    act(() => hook.result.current.scanner.onRetry());
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onScan.mock.calls.map((call) => call[0])).toEqual([url, url]);
  });
});
