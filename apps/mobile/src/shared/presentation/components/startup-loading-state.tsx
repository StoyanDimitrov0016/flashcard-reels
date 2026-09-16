import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppResetAction } from "@/shared/presentation/components/app-reset-action";
import { getAppColors } from "@/shared/presentation/theme-colors";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize } from "@/shared/presentation/typography";

type StartupLoadingStateProps = Readonly<{ label?: string }>;

export function StartupLoadingState({ label = "Starting the app…" }: StartupLoadingStateProps) {
  const colors = getAppColors(useColorScheme() === "dark" ? "dark" : "light");

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.content}>
        <ActivityIndicator color={colors.textPrimary} size="large" />
        <Text style={{ color: colors.textPrimary, fontSize: fontSize.body }}>{label}</Text>
        <AppResetAction />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: "center", flex: 1, gap: sizes.spacing.section, justifyContent: "center" },
  screen: { flex: 1 },
});
