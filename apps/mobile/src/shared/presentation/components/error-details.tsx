import Constants from "expo-constants";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { describeError } from "@/shared/errors/describe-error";
import { sizes } from "@/shared/presentation/sizes";
import { getAppColors } from "@/shared/presentation/theme-colors";
import { fontSize } from "@/shared/presentation/typography";

type ErrorDetailsProps = Readonly<{ error: unknown }>;

export function ErrorDetails({ error }: ErrorDetailsProps) {
  const [visible, setVisible] = useState(false);
  const colors = getAppColors(useColorScheme() === "dark" ? "dark" : "light");

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible((current) => !current)}
        style={styles.toggle}
      >
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {visible ? "Hide error details" : "Show error details"}
        </Text>
      </Pressable>
      {visible && (
        <Text selectable style={[styles.details, { color: colors.textSecondary }]}>
          {`App ${Constants.expoConfig?.version ?? "unknown"}\n${Platform.OS} ${Platform.Version}\n\n${describeError(error)}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: sizes.spacing.medium, maxWidth: 680, width: "100%" },
  details: {
    fontFamily: "monospace",
    fontSize: fontSize.caption,
    textAlign: "left",
    width: "100%",
  },
  label: { fontSize: fontSize.body },
  toggle: { minHeight: sizes.touchTarget.minimum, justifyContent: "center" },
});
