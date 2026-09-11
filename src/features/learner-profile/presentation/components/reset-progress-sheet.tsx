import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

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
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={busy ? undefined : onCancel}
      statusBarTranslucent
      transparent
      visible={isPresented}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Cancel progress reset"
          accessibilityRole="button"
          disabled={busy}
          onPress={onCancel}
          style={styles.scrim}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.iconShell}>
            <SymbolView
              name={{ android: "restart_alt", ios: "arrow.counterclockwise", web: "restart_alt" }}
              size={sizes.icon.large}
              tintColor={colors.danger}
            />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Reset {scope}?
          </Text>
          <Text style={styles.message}>
            Learning history and profiling will be cleared. Your installed cards and decks will
            remain available.
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
      </View>
    </Modal>
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
    cancelLabel: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.bold },
    disabled: { opacity: 0.58 },
    error: { color: colors.danger, fontSize: fontSize.caption, textAlign: "center" },
    handle: {
      alignSelf: "center",
      backgroundColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      height: 4,
      width: 40,
    },
    iconShell: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: colors.danger + "18",
      borderColor: colors.danger + "38",
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
    modalRoot: { flex: 1, justifyContent: "flex-end" },
    resetButton: {
      alignItems: "center",
      backgroundColor: colors.danger,
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
    scrim: {
      backgroundColor: colors.scrim,
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheet: {
      alignSelf: "center",
      backgroundColor: colors.surface,
      borderColor: colors.borderStrong,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      borderWidth: sizes.border,
      gap: sizes.spacing.xLarge,
      maxWidth: 560,
      padding: sizes.spacing.content,
      paddingBottom: sizes.spacing.spacious,
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
