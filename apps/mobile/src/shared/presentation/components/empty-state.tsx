import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type EmptyStateProps = Readonly<{
  action?: Readonly<{ label: string; onPress: () => void }>;
  /** Per-platform names; a bare SF Symbol name draws nothing on Android. */
  icon: Exclude<SymbolViewProps["name"], string>;
  message: string;
  title: string;
}>;

/** A list or screen with nothing to show yet: what is missing and what to do about it. */
export function EmptyState({ action, icon, message, title }: EmptyStateProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.iconShell}>
        <SymbolView name={icon} size={sizes.icon.medium} tintColor={colors.textSecondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {!!action && (
        <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.action}>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    action: {
      alignItems: "center",
      borderColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      borderWidth: sizes.border,
      justifyContent: "center",
      marginTop: sizes.spacing.medium,
      minHeight: sizes.touchTarget.minimum,
      paddingHorizontal: sizes.spacing.content,
    },
    actionLabel: {
      color: colors.textPrimary,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    container: {
      alignItems: "center",
      gap: sizes.spacing.small,
      paddingHorizontal: sizes.spacing.content,
      paddingVertical: sizes.spacing.spacious * 2,
    },
    iconShell: {
      alignItems: "center",
      backgroundColor: colors.surfaceSubtle,
      borderRadius: sizes.radius.pill,
      height: sizes.iconBadge.medium,
      justifyContent: "center",
      marginBottom: sizes.spacing.small,
      width: sizes.iconBadge.medium,
    },
    message: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
      maxWidth: 320,
      textAlign: "center",
    },
    title: { color: colors.textPrimary, fontSize: fontSize.bodyLarge, fontWeight: fontWeight.bold },
  });
}
