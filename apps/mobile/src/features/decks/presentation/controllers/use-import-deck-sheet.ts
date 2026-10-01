import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";
import * as z from "zod";

import { reportError } from "@/shared/errors/report-error";

const PrivateDevelopmentHostPattern =
  /^(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|\[::1\])$/;
const RemoteDeckUrlSchema = z.compile(
  z.union([
    z.url({ protocol: /^https$/ }),
    z
      .url({ hostname: PrivateDevelopmentHostPattern, protocol: /^http$/ })
      .refine((url) => new URL(url).pathname.startsWith("/t/")),
  ])
);

/** Everything the QR step renders from: camera access, the live preview, and scan failures. */
export type DeckQrScanner = Readonly<{
  cameraAccessError: string | null;
  cameraActive: boolean;
  /** Undefined while a scan is being handled or has failed, so the camera stops reporting codes. */
  onBarcode: ((result: BarcodeScanningResult) => void) | undefined;
  onCameraError: () => void;
  onOpenSettings: () => void;
  onRequestPermission: () => void;
  onRetry: () => void;
  retryLabel: "Try again" | "Scan again";
  paused: boolean;
  permission: ReturnType<typeof useCameraPermissions>[0];
  processing: boolean;
  scanError: string | null;
}>;

type ImportDeckSheetOptions = Readonly<{
  canRetryDownload?: boolean;
  onBrowse: () => Promise<boolean>;
  onClearError: () => void;
  onClose: () => void;
  onScan: (url: string) => Promise<boolean>;
  visible: boolean;
}>;

/**
 * The import sheet's flow: choosing a source, then scanning a QR code. Each scan runs in a session
 * so a result that arrives after the person went back or closed the sheet is ignored.
 */
export function useImportDeckSheet({
  canRetryDownload = false,
  onBrowse,
  onClearError,
  onClose,
  onScan,
  visible,
}: ImportDeckSheetOptions) {
  const [mode, setMode] = useState<"choices" | "scanner">("choices");
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraAccessError, setCameraAccessError] = useState<string | null>(null);
  const [appActive, setAppActive] = useState(
    AppState.currentState !== "background" && AppState.currentState !== "inactive"
  );
  const screenFocused = useIsFocused();
  const cameraActive = visible && screenFocused && appActive;
  const [processingScan, setProcessingScan] = useState(false);
  const [scanPaused, setScanPaused] = useState(false);
  const [hasScannedUrl, setHasScannedUrl] = useState(false);
  const scanLocked = useRef(false);
  const scanSession = useRef(0);
  const lastScannedUrl = useRef<string | null>(null);
  const scanRequestInFlight = useRef(false);

  useEffect(function trackCameraForeground() {
    const subscription = AppState.addEventListener("change", (state) =>
      setAppActive(state === "active")
    );
    return function stopTrackingCameraForeground() {
      scanSession.current += 1;
      scanLocked.current = true;
      subscription.remove();
    };
  }, []);

  useEffect(
    function refreshCameraAccessOnReturn() {
      if (!visible || mode !== "scanner") {
        return undefined;
      }
      let active = true;
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          void getPermission()
            .then(() => {
              if (active) {
                setCameraAccessError(null);
              }
            })
            .catch((error: unknown) => {
              reportError(error, "Camera permission refresh failure");
              if (active) {
                setCameraAccessError(
                  "Couldn’t check camera access. Try again or browse a deck file."
                );
              }
            });
        }
      });
      return function stopRefreshingCameraAccess() {
        active = false;
        subscription.remove();
      };
    },
    [getPermission, mode, visible]
  );

  const askForCamera = async () => {
    const session = scanSession.current;
    setCameraAccessError(null);
    try {
      await requestPermission();
    } catch (error) {
      reportError(error, "Camera permission request failure");
      if (session === scanSession.current) {
        setCameraAccessError("Couldn’t request camera access. Try again or browse a deck file.");
      }
    }
  };

  const openCameraSettings = async () => {
    const session = scanSession.current;
    try {
      await Linking.openSettings();
    } catch (error) {
      reportError(error, "Camera settings failure");
      if (session === scanSession.current) {
        setCameraAccessError("Couldn’t open Settings. Open them manually or browse a deck file.");
      }
    }
  };

  const showChoices = () => {
    lastScannedUrl.current = null;
    setHasScannedUrl(false);
    scanSession.current += 1;
    setMode("choices");
    setScanError(null);
    setCameraAccessError(null);
    setProcessingScan(false);
    setScanPaused(false);
    scanLocked.current = true;
    onClearError();
  };

  const close = () => {
    showChoices();
    onClose();
  };

  const beginScanning = async () => {
    lastScannedUrl.current = null;
    setHasScannedUrl(false);
    scanSession.current += 1;
    onClearError();
    scanLocked.current = false;
    setScanPaused(false);
    setScanError(null);
    setCameraAccessError(null);
    setMode("scanner");
    if (!permission?.granted && permission?.canAskAgain !== false) {
      await askForCamera();
    }
  };

  const handleBarcode = async ({ data }: BarcodeScanningResult) => {
    if (scanLocked.current || !cameraActive) {
      return;
    }
    scanLocked.current = true;
    const session = scanSession.current;
    setProcessingScan(true);
    setScanError(null);
    const parsed = RemoteDeckUrlSchema.safeParse(data);
    if (!parsed.success) {
      setScanError("That isn’t a deck import code.");
      setProcessingScan(false);
      setScanPaused(true);
      return;
    }
    lastScannedUrl.current = parsed.data;
    setHasScannedUrl(true);
    await runScan(parsed.data, session);
  };

  const runScan = async (url: string, session: number) => {
    if (scanRequestInFlight.current) {
      return;
    }
    scanRequestInFlight.current = true;
    scanLocked.current = true;
    setProcessingScan(true);
    let imported: boolean;
    try {
      imported = await onScan(url);
    } finally {
      scanRequestInFlight.current = false;
    }
    if (session !== scanSession.current) {
      return;
    }
    if (imported) {
      close();
      return;
    }
    setProcessingScan(false);
    setScanPaused(true);
  };

  const browse = async () => {
    const session = scanSession.current;
    const imported = await onBrowse();
    if (imported && session === scanSession.current) {
      close();
    }
  };

  const scanner: DeckQrScanner = {
    cameraAccessError,
    cameraActive,
    onBarcode: processingScan || scanPaused ? undefined : (result) => void handleBarcode(result),
    onCameraError: () => {
      if (scanLocked.current || !cameraActive) {
        return;
      }
      scanLocked.current = true;
      setScanError("Couldn’t start the camera. Scan again or browse a deck file.");
      setScanPaused(true);
    },
    onOpenSettings: () => void openCameraSettings(),
    onRequestPermission: () => void askForCamera(),
    retryLabel:
      canRetryDownload && hasScannedUrl && scanError === null ? "Try again" : "Scan again",
    onRetry: () => {
      if (scanLocked.current && processingScan) {
        return;
      }
      onClearError();
      if (canRetryDownload && lastScannedUrl.current !== null && scanError === null) {
        void runScan(lastScannedUrl.current, scanSession.current);
        return;
      }
      scanLocked.current = false;
      setScanPaused(false);
      setScanError(null);
    },
    paused: scanPaused,
    permission,
    processing: processingScan,
    scanError,
  };

  return {
    beginScanning: () => void beginScanning(),
    browse: () => void browse(),
    /** Leaves the scanner for a file picker, dropping any scan still in flight. */
    browseInstead: () => {
      showChoices();
      void browse();
    },
    close,
    mode,
    scanner,
    showChoices,
  };
}
