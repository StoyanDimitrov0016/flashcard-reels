import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";

import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type DestructiveConfirmationSheetProps = Readonly<{
  actionLabel: string;
  busy: boolean;
  error: string | null;
  icon: ComponentProps<typeof SymbolView>["name"];
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
}>;

export function DestructiveConfirmationSheet({
  actionLabel,
  busy,
  error,
  icon,
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: DestructiveConfirmationSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <AppBottomSheet dismissible={!busy} onClose={onCancel} size="content" visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.iconShell}>
          <SymbolView name={icon} size={sizes.icon.large} tintColor={colors.error} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onCancel}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onConfirm}
            style={[styles.confirmButton, busy && styles.disabled]}
          >
            {busy ? (
              <ActivityIndicator color={colors.actionPrimaryText} size="small" />
            ) : (
              <Text style={styles.confirmLabel}>{actionLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </AppBottomSheet>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    actions: { flexDirection: "row", gap: sizes.spacing.medium, marginTop: sizes.spacing.medium },
    cancelButton: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      borderWidth: sizes.border,
      flex: 1,
      justifyContent: "center",
      minHeight: 46,
    },
    cancelLabel: {
      color: colors.textPrimary,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    confirmButton: {
      alignItems: "center",
      backgroundColor: colors.error,
      borderRadius: sizes.radius.pill,
      flex: 1,
      justifyContent: "center",
      minHeight: 46,
    },
    confirmLabel: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.heavy,
    },
    disabled: { opacity: 0.58 },
    error: { color: colors.error, fontSize: fontSize.caption, textAlign: "center" },
    iconShell: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: colors.error + "18",
      borderColor: colors.error + "38",
      borderRadius: sizes.radius.pill,
      borderWidth: sizes.border,
      height: 64,
      justifyContent: "center",
      marginTop: sizes.spacing.section,
      width: 64,
    },
    message: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
      textAlign: "center",
    },
    sheet: {
      alignSelf: "center",
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      gap: sizes.spacing.xLarge,
      maxWidth: sizes.sheet.maxWidthCompact,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.small,
      width: "100%",
    },
    title: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.heavy,
      textAlign: "center",
    },
  });
}
