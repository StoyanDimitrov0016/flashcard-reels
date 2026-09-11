import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontWeight, textStyles } from "@/shared/presentation/typography";

type ErrorStateProps = Readonly<{
  onHomeAction: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  homeActionLabel: string;
  title: string;
}>;

export function ErrorState({
  onHomeAction,
  onPrimaryAction,
  primaryActionLabel,
  homeActionLabel,
  title,
}: ErrorStateProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" onPress={onHomeAction} style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>{homeActionLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onPrimaryAction}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryLabel}>{primaryActionLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      alignItems: "center",
      backgroundColor: colors.background,
      flex: 1,
      gap: sizes.spacing.section,
      justifyContent: "center",
      padding: sizes.spacing.spacious,
    },
    title: {
      color: colors.textPrimary,
      textAlign: "center",
      ...textStyles.screenTitle,
    },
    actionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      justifyContent: "center",
      marginTop: sizes.spacing.wide,
      width: "100%",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.pill,
      flex: 1,
      paddingHorizontal: sizes.spacing.content,
      paddingVertical: sizes.spacing.xLarge,
    },
    primaryLabel: {
      color: colors.actionPrimaryText,
      ...textStyles.primaryButtonLabel,
    },
    secondaryButton: {
      alignItems: "center",
      flex: 1,
      paddingHorizontal: sizes.spacing.section,
      paddingVertical: sizes.spacing.medium,
    },
    secondaryLabel: {
      color: colors.textSecondary,
      fontWeight: fontWeight.bold,
    },
  });
}
