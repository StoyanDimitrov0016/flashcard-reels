import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";

type ResetProgressSheetProps = Readonly<{
  busy: boolean;
  error: string | null;
  isPresented: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  scope: string;
}>;

export function ResetProgressSheet({
  busy,
  error,
  isPresented,
  onCancel,
  onConfirm,
  scope,
}: ResetProgressSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <AppBottomSheet dismissible={!busy} onClose={onCancel} visible={isPresented}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.iconShell}>
          <SymbolView
            name={{ android: "restart_alt", ios: "arrow.counterclockwise", web: "restart_alt" }}
            size={sizes.icon.large}
            tintColor={colors.error}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Reset {scope}?
        </Text>
        <Text style={styles.message}>
          Learning history and profiling will be cleared. Your installed cards and decks will remain
          available.
        </Text>
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
            style={[styles.resetButton, busy && styles.disabled]}
          >
            {busy ? (
              <ActivityIndicator color={colors.actionPrimaryText} size="small" />
            ) : (
              <Text style={styles.resetLabel}>Reset progress</Text>
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
    resetButton: {
      alignItems: "center",
      backgroundColor: colors.error,
      borderRadius: sizes.radius.pill,
      flex: 1,
      justifyContent: "center",
      minHeight: 46,
    },
    resetLabel: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.heavy,
    },
    sheet: {
      alignSelf: "center",
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      gap: sizes.spacing.xLarge,
      maxWidth: 560,
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
