import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import {
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  textStyles,
} from "@/shared/presentation/typography";

type ErrorStateProps = Readonly<{
  eyebrow?: string;
  message?: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  title: string;
}>;

export function ErrorState({
  eyebrow,
  message,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  title,
}: ErrorStateProps) {
  return (
    <SafeAreaView style={styles.screen}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable accessibilityRole="button" onPress={onPrimaryAction} style={styles.primaryButton}>
        <Text style={styles.primaryLabel}>{primaryActionLabel}</Text>
      </Pressable>
      {onSecondaryAction && secondaryActionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onSecondaryAction}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryLabel}>{secondaryActionLabel}</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: palette.background,
    flex: 1,
    gap: sizes.spacing.section,
    justifyContent: "center",
    padding: sizes.spacing.spacious,
  },
  eyebrow: {
    color: palette.danger,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.widest,
    textTransform: "uppercase",
  },
  title: {
    color: palette.textPrimary,
    textAlign: "center",
    ...textStyles.screenTitle,
  },
  message: {
    color: palette.textSecondary,
    fontSize: fontSize.footnote,
    lineHeight: lineHeight.footnote,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: palette.textPrimary,
    borderRadius: sizes.radius.pill,
    paddingHorizontal: sizes.spacing.content,
    paddingVertical: sizes.spacing.xLarge,
  },
  primaryLabel: {
    color: palette.actionPrimaryText,
    ...textStyles.primaryButtonLabel,
  },
  secondaryButton: {
    paddingHorizontal: sizes.spacing.section,
    paddingVertical: sizes.spacing.medium,
  },
  secondaryLabel: {
    color: palette.textSecondary,
    fontWeight: fontWeight.bold,
  },
});
