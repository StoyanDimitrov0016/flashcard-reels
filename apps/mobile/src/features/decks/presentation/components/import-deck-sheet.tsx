import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { SymbolView } from "expo-symbols";
import { useRef, useState, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as z from "zod";

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
  onBrowse: () => Promise<boolean>;
  onClose: () => void;
  onScan: (url: string) => Promise<boolean>;
  visible: boolean;
}>;

export function ImportDeckSheet({
  errorMessage,
  importing,
  onBrowse,
  onClose,
  onScan,
  visible,
}: ImportDeckSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [mode, setMode] = useState<"choices" | "scanner">("choices");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [processingScan, setProcessingScan] = useState(false);
  const [scanPaused, setScanPaused] = useState(false);
  const scanLocked = useRef(false);

  const close = () => {
    setMode("choices");
    setScanError(null);
    setProcessingScan(false);
    setScanPaused(false);
    scanLocked.current = false;
    onClose();
  };

  const beginScanning = async () => {
    setScanError(null);
    setMode("scanner");
    if (!permission?.granted && permission?.canAskAgain !== false) {
      await requestPermission();
    }
  };

  const handleBarcode = async ({ data }: BarcodeScanningResult) => {
    if (scanLocked.current) {
      return;
    }
    scanLocked.current = true;
    setProcessingScan(true);
    setScanError(null);
    const parsed = RemoteDeckUrlSchema.safeParse(data);
    if (!parsed.success) {
      setScanError("That isn’t a deck import code.");
      setProcessingScan(false);
      scanLocked.current = false;
      return;
    }
    const imported = await onScan(parsed.data);
    if (imported) {
      close();
      return;
    }
    setProcessingScan(false);
    setScanPaused(true);
  };

  const handleBrowse = async () => {
    const imported = await onBrowse();
    if (imported) {
      close();
    }
  };

  return (
    <AppBottomSheet dismissible={!importing} onClose={close} size="large" visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={mode === "scanner" ? "Back to import choices" : "Close import"}
            accessibilityRole="button"
            disabled={importing}
            onPress={mode === "scanner" ? () => setMode("choices") : close}
            style={styles.iconButton}
          >
            <SymbolView
              name={
                mode === "scanner"
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
              errorMessage={errorMessage}
              importing={importing}
              onBarcode={
                processingScan || scanPaused ? undefined : (result) => void handleBarcode(result)
              }
              onRetry={() => {
                scanLocked.current = false;
                setScanPaused(false);
                setScanError(null);
              }}
              permission={permission}
              processing={processingScan}
              paused={scanPaused}
              requestPermission={() => void requestPermission()}
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
              {importing ? <ImportProgress message="Importing deck…" /> : null}
              {errorMessage ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {errorMessage}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </AppBottomSheet>
  );
}

type ScannerContentProps = Readonly<{
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
        <Text style={styles.message}>Camera access is needed to scan a deck QR code.</Text>
        {permission.canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            onPress={requestPermission}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Allow camera access</Text>
          </Pressable>
        ) : (
          <Text style={styles.error}>
            Camera permission is denied. Enable it in device settings, then retry.
          </Text>
        )}
      </View>
    );
  }

  if (processing || importing) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.centered}>
        <ImportProgress message="Code scanned. Downloading and importing deck…" />
        <Text style={styles.hint}>You can move the phone away from the QR code now.</Text>
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
        <Text style={styles.error}>{errorMessage ?? "Could not import this deck. Try again."}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Scan again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.scannerShell}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        facing="back"
        onBarcodeScanned={onBarcode}
        style={styles.camera}
      />
      <Text style={styles.hint}>
        Point the camera at the QR code shown by Flashcard Reels on the web.
      </Text>
      {scanError ? <Text style={styles.error}>{scanError}</Text> : null}
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
      backgroundColor: colors.error + "18",
      borderRadius: sizes.radius.pill,
      height: 64,
      justifyContent: "center",
      width: 64,
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
