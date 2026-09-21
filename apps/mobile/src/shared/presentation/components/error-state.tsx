import type { ReactNode } from "react";

import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { sizes } from "@/shared/presentation/sizes";
import { getAppColors, type AppColors } from "@/shared/presentation/theme-colors";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

export type ErrorStateAction = Readonly<{
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary";
}>;

type ErrorStateProps = Readonly<{
  title: string;
  message: string;
  actions: readonly ErrorStateAction[];
  colors?: AppColors;
  children?: ReactNode;
}>;

export function ErrorState({ title, message, actions, colors, children }: ErrorStateProps) {
  const colorScheme = useColorScheme();
  const palette = colors ?? getAppColors(colorScheme === "dark" ? "dark" : "light");
  const styles = createStyles(palette);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actionRow}>
          {actions.map((action) => (
            <Pressable
              accessibilityRole="button"
              key={action.label}
              onPress={action.onPress}
              style={action.kind === "secondary" ? styles.secondaryButton : styles.primaryButton}
            >
              <Text
                style={action.kind === "secondary" ? styles.secondaryLabel : styles.primaryLabel}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    actionRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: sizes.spacing.medium,
    },
    content: {
      alignItems: "center",
      backgroundColor: colors.canvas,
      flexGrow: 1,
      gap: sizes.spacing.section,
      justifyContent: "center",
      padding: sizes.spacing.spacious,
    },
    message: { color: colors.textSecondary, fontSize: fontSize.body, textAlign: "center" },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.medium,
      justifyContent: "center",
      minHeight: sizes.touchTarget.minimum,
      paddingHorizontal: sizes.spacing.large,
    },
    primaryLabel: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    screen: { backgroundColor: colors.canvas, flex: 1 },
    secondaryButton: {
      alignItems: "center",
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.medium,
      borderWidth: sizes.border,
      justifyContent: "center",
      minHeight: sizes.touchTarget.minimum,
      paddingHorizontal: sizes.spacing.large,
    },
    secondaryLabel: { color: colors.textPrimary, fontSize: fontSize.body },
    title: {
      color: colors.textPrimary,
      fontSize: fontSize.title1,
      fontWeight: fontWeight.heavy,
      textAlign: "center",
    },
  });
}
