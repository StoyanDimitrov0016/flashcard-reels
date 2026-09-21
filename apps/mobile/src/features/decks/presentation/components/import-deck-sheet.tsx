import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useIsFocused } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as z from "zod";

import { reportError } from "@/shared/errors/report-error";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

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

type ImportDeckSheetProps = Readonly<{
  errorMessage: string | null;
  importing: boolean;
  downloading: boolean;
  onClearError: () => void;
  onBrowse: () => Promise<boolean>;
  onClose: () => void;
  onScan: (url: string) => Promise<boolean>;
  visible: boolean;
}>;

export function ImportDeckSheet({
  errorMessage,
  importing,
  downloading,
  onClearError,
  onBrowse,
  onClose,
  onScan,
  visible,
}: ImportDeckSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
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
  const scanLocked = useRef(false);
  const scanSession = useRef(0);

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

  const resetScanner = () => {
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
    resetScanner();
    onClose();
  };

  const beginScanning = async () => {
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
    const imported = await onScan(parsed.data);
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

  const handleBrowse = async () => {
    const session = scanSession.current;
    const imported = await onBrowse();
    if (imported && session === scanSession.current) {
      close();
    }
  };

  return (
    <AppBottomSheet
      dismissible={!importing || downloading}
      onClose={close}
      size="large"
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={
              mode === "scanner" && !downloading ? "Back to import choices" : "Close import"
            }
            accessibilityRole="button"
            disabled={importing && !downloading}
            onPress={
              mode === "scanner" && !downloading
                ? () => {
                    resetScanner();
                  }
                : close
            }
            style={styles.iconButton}
          >
            <SymbolView
              name={
                mode === "scanner" && !downloading
                  ? { android: "arrow_back", ios: "chevron.left", web: "arrow_back" }
                  : { android: "close", ios: "xmark", web: "close" }
              }
              size={sizes.icon.medium}
              tintColor={colors.textPrimary}
            />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            {mode === "scanner" ? "Scan QR code" : "Import deck"}
          </Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.content}>
          {mode === "scanner" ? (
            <ScannerContent
              cameraActive={cameraActive}
              cameraAccessError={cameraAccessError}
              downloading={downloading}
              errorMessage={errorMessage}
              importing={importing}
              onBarcode={
                processingScan || scanPaused ? undefined : (result) => void handleBarcode(result)
              }
              onRetry={() => {
                onClearError();
                scanLocked.current = false;
                setScanPaused(false);
                setScanError(null);
              }}
              permission={permission}
              processing={processingScan}
              paused={scanPaused}
              requestPermission={() => void askForCamera()}
              onSettings={() => void openCameraSettings()}
              onBrowse={() => {
                resetScanner();
                void handleBrowse();
              }}
              onCancelDownload={close}
              onCameraError={() => {
                if (scanLocked.current || !cameraActive) {
                  return;
                }
                scanLocked.current = true;
                setScanError("Couldn’t start the camera. Scan again or browse a deck file.");
                setScanPaused(true);
              }}
              scanError={scanError}
            />
          ) : (
            <View style={styles.choices}>
              <ImportChoice
                description="From Flashcard Reels on the web."
                icon={{
                  android: "qr_code_scanner",
                  ios: "qrcode.viewfinder",
                  web: "qr_code_scanner",
                }}
                label="Scan QR code"
                onPress={() => void beginScanning()}
              />
              <ImportChoice
                description="Choose a .fcrdeck file."
                disabled={importing}
                icon={{ android: "folder_open", ios: "folder", web: "folder_open" }}
                label="Browse device"
                onPress={() => void handleBrowse()}
              />
              {importing && <ImportProgress message="Importing deck…" />}
              {!!errorMessage && (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {errorMessage}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </AppBottomSheet>
  );
}

type ScannerContentProps = Readonly<{
  cameraActive: boolean;
  cameraAccessError: string | null;
  downloading: boolean;
  onSettings: () => void;
  onBrowse: () => void;
  onCancelDownload: () => void;
  onCameraError: () => void;
  errorMessage: string | null;
  importing: boolean;
  onBarcode: ((result: BarcodeScanningResult) => void) | undefined;
  onRetry: () => void;
  paused: boolean;
  permission: ReturnType<typeof useCameraPermissions>[0];
  processing: boolean;
  requestPermission: () => void;
  scanError: string | null;
}>;

function ScannerContent({
  cameraActive,
  cameraAccessError,
  downloading,
  onSettings,
  onBrowse,
  onCancelDownload,
  onCameraError,
  errorMessage,
  importing,
  onBarcode,
  onRetry,
  paused,
  permission,
  processing,
  requestPermission,
  scanError,
}: ScannerContentProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  if (!permission) {
    return <ActivityIndicator color={colors.interactive} size="large" />;
  }
  if (!permission.granted) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.centered}>
        <SymbolView
          name={{ android: "camera_alt", ios: "camera", web: "camera_alt" }}
          size={sizes.icon.large}
          tintColor={colors.textSecondary}
        />
        <Text style={styles.message}>Allow camera access to scan a deck QR code.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={permission.canAskAgain ? requestPermission : onSettings}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {permission.canAskAgain ? "Allow camera access" : "Open Settings"}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onBrowse} style={styles.secondaryButton}>
          <Text style={styles.message}>Browse a deck file instead</Text>
        </Pressable>
        {!!cameraAccessError && <Text style={styles.error}>{cameraAccessError}</Text>}
      </View>
    );
  }

  if (processing || importing) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.centered}>
        <ImportProgress message={downloading ? "Downloading deck…" : "Installing deck…"} />
        {downloading && (
          <Pressable
            accessibilityRole="button"
            onPress={onCancelDownload}
            style={styles.secondaryButton}
          >
            <Text style={styles.message}>Cancel download</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (paused) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.centered}>
        <View style={styles.statusIcon}>
          <SymbolView
            name={{ android: "error", ios: "exclamationmark.triangle.fill", web: "error" }}
            size={sizes.icon.large}
            tintColor={colors.error}
          />
        </View>
        <Text style={styles.error}>
          {scanError ?? errorMessage ?? "Couldn’t import this deck. Scan again."}
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Scan again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.scannerShell}>
      {cameraActive && (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          facing="back"
          onBarcodeScanned={onBarcode}
          onMountError={onCameraError}
          style={styles.camera}
        />
      )}
      {!!cameraAccessError && <Text style={styles.error}>{cameraAccessError}</Text>}
      <Text style={styles.hint}>
        Point the camera at the QR code shown by Flashcard Reels on the web.
      </Text>
      {!!scanError && <Text style={styles.error}>{scanError}</Text>}
    </View>
  );
}

type ImportProgressProps = Readonly<{ message: string }>;

function ImportProgress({ message }: ImportProgressProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.progress}>
      <ActivityIndicator color={colors.interactive} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

type ImportChoiceProps = Readonly<{
  description: string;
  disabled?: boolean;
  icon: ComponentProps<typeof SymbolView>["name"];
  label: string;
  onPress: () => void;
}>;

function ImportChoice({ description, disabled, icon, label, onPress }: ImportChoiceProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.choice}
    >
      <SymbolView name={icon} size={sizes.icon.medium} tintColor={colors.interactive} />
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceLabel}>{label}</Text>
        <Text style={styles.choiceDescription}>{description}</Text>
      </View>
      <SymbolView
        name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
        size={sizes.icon.small}
        tintColor={colors.textTertiary}
      />
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    camera: {
      borderRadius: sizes.radius.card,
      flex: 1,
      overflow: "hidden",
      width: "100%",
    },
    centered: {
      alignItems: "center",
      flex: 1,
      gap: sizes.spacing.section,
      justifyContent: "center",
    },
    choice: {
      alignItems: "center",
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.xLarge,
      minHeight: 76,
      padding: sizes.spacing.section,
    },
    choiceCopy: { flex: 1, gap: sizes.spacing.xSmall },
    choiceDescription: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
    },
    choiceLabel: {
      color: colors.textPrimary,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    choices: { gap: sizes.spacing.section },
    content: {
      flex: 1,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
    },
    error: {
      color: colors.error,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
      textAlign: "center",
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: sizes.spacing.section,
      paddingHorizontal: sizes.spacing.content,
    },
    hint: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
      textAlign: "center",
    },
    iconButton: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
    },
    message: { color: colors.textSecondary, fontSize: fontSize.body, textAlign: "center" },
    primaryButton: {
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.control,
      justifyContent: "center",
      minHeight: sizes.control.standard,
      paddingHorizontal: sizes.spacing.content,
    },
    primaryButtonText: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    progress: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      justifyContent: "center",
    },
    scannerShell: { flex: 1, gap: sizes.spacing.section },
    statusIcon: {
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButton: {
      minHeight: sizes.touchTarget.minimum,
      justifyContent: "center",
      paddingHorizontal: sizes.spacing.content,
    },
    sheet: { backgroundColor: colors.surfaceRaised, flex: 1 },
    title: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.heavy,
      textAlign: "center",
    },
  });
}
