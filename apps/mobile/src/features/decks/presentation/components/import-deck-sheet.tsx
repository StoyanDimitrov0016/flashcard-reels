import type { ComponentProps } from "react";

import { CameraView } from "expo-camera";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckDownloadProgress } from "@/features/decks/presentation/controllers/use-import-deck-package";

import { DeckImportProgress } from "@/features/decks/presentation/components/deck-import-progress";
import {
  useImportDeckSheet,
  type DeckQrScanner,
} from "@/features/decks/presentation/controllers/use-import-deck-sheet";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type ImportDeckSheetProps = Readonly<{
  downloadProgress: DeckDownloadProgress | null;
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
  downloadProgress,
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
  const { beginScanning, browse, browseInstead, close, mode, scanner, showChoices } =
    useImportDeckSheet({ onBrowse, onClearError, onClose, onScan, visible });

  return (
    <AppBottomSheet dismissible={!importing || downloading} onClose={close} visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <SheetHeader
          back={
            mode === "scanner" && !downloading
              ? { label: "Back to import choices", onPress: showChoices }
              : undefined
          }
          closeDisabled={importing && !downloading}
          closeLabel="Close import"
          onClose={close}
          title={mode === "scanner" ? "Scan QR code" : "Import deck"}
        />
        <View style={styles.content}>
          {mode === "scanner" ? (
            <ScannerContent
              downloadProgress={downloadProgress}
              downloading={downloading}
              errorMessage={errorMessage}
              importing={importing}
              onBrowseInstead={browseInstead}
              onCancelDownload={close}
              scanner={scanner}
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
                onPress={beginScanning}
              />
              <ImportChoice
                description="Choose a .fcrdeck file."
                disabled={importing}
                icon={{ android: "folder_open", ios: "folder", web: "folder_open" }}
                label="Browse device"
                onPress={browse}
              />
              {importing && (
                <DeckImportProgress phase="installing" progress={null} showSteps={false} />
              )}
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
  downloadProgress: DeckDownloadProgress | null;
  downloading: boolean;
  errorMessage: string | null;
  importing: boolean;
  onBrowseInstead: () => void;
  onCancelDownload: () => void;
  scanner: DeckQrScanner;
}>;

function ScannerContent({
  downloadProgress,
  downloading,
  errorMessage,
  importing,
  onBrowseInstead,
  onCancelDownload,
  scanner,
}: ScannerContentProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { permission } = scanner;
  if (!permission) {
    return <ActivityIndicator color={colors.textSecondary} size="large" />;
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
          onPress={permission.canAskAgain ? scanner.onRequestPermission : scanner.onOpenSettings}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {permission.canAskAgain ? "Allow camera access" : "Open Settings"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onBrowseInstead}
          style={styles.secondaryButton}
        >
          <Text style={styles.message}>Browse a deck file instead</Text>
        </Pressable>
        {!!scanner.cameraAccessError && (
          <Text style={styles.error}>{scanner.cameraAccessError}</Text>
        )}
      </View>
    );
  }

  if (scanner.processing || importing) {
    return (
      <DeckImportProgress
        onCancel={onCancelDownload}
        phase={downloading || scanner.processing ? "downloading" : "installing"}
        progress={downloadProgress}
        showSteps
      />
    );
  }

  if (scanner.paused) {
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
          {scanner.scanError ?? errorMessage ?? "Couldn’t import this deck. Scan again."}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={scanner.onRetry}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Scan again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.scannerShell}>
      {scanner.cameraActive && (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          facing="back"
          onBarcodeScanned={scanner.onBarcode}
          onMountError={scanner.onCameraError}
          style={styles.camera}
        />
      )}
      {!!scanner.cameraAccessError && <Text style={styles.error}>{scanner.cameraAccessError}</Text>}
      <Text style={styles.hint}>
        Point the camera at the QR code shown by Flashcard Reels on the web.
      </Text>
      {!!scanner.scanError && <Text style={styles.error}>{scanner.scanError}</Text>}
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
      <SymbolView name={icon} size={sizes.icon.medium} tintColor={colors.textPrimary} />
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
    // A square viewfinder, since the sheet is sized to its content.
    camera: {
      aspectRatio: 1,
      borderRadius: sizes.radius.card,
      overflow: "hidden",
      width: "100%",
    },
    centered: {
      alignItems: "center",
      gap: sizes.spacing.section,
      justifyContent: "center",
      paddingVertical: sizes.spacing.spacious,
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
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
    },
    error: {
      color: colors.error,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
      textAlign: "center",
    },
    hint: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
      textAlign: "center",
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
    scannerShell: { gap: sizes.spacing.section },
    statusIcon: {
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButton: {
      minHeight: sizes.touchTarget.minimum,
      justifyContent: "center",
      paddingHorizontal: sizes.spacing.content,
    },
    sheet: { flexShrink: 1 },
  });
}
