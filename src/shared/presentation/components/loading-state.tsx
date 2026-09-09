import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize } from "@/shared/presentation/typography";

type LoadingStateProps = Readonly<{
  accessibilityLabel?: string;
  fill?: boolean;
  label?: string;
}>;

export function LoadingState({ accessibilityLabel, fill = true, label }: LoadingStateProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={fill ? styles.fill : styles.inline}>
      <ActivityIndicator color={palette.textPrimary} size="large" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { alignItems: "center", flex: 1, gap: sizes.spacing.section, justifyContent: "center" },
  inline: { alignItems: "center", gap: sizes.spacing.section },
  label: { color: palette.textSecondary, fontSize: fontSize.body },
});
