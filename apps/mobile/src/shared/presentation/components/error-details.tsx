import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { describeError } from "@/shared/application/error-details";
import { getAppColors } from "@/shared/presentation/theme-colors";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize } from "@/shared/presentation/typography";

type ErrorDetailsProps = Readonly<{ error: unknown }>;

export function ErrorDetails({ error }: ErrorDetailsProps) {
  const [visible, setVisible] = useState(false);
  const colors = getAppColors("light");

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" onPress={() => setVisible((current) => !current)}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {visible ? "Hide error details" : "Show error details"}
        </Text>
      </Pressable>
      {visible ? (
        <Text selectable style={[styles.details, { color: colors.textSecondary }]}>
          {describeError(error)}
        </Text>
      ) : null}
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
});
