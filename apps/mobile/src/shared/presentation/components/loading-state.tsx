import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize } from "@/shared/presentation/typography";

type LoadingStateProps = Readonly<{
  accessibilityLabel?: string;
  fill?: boolean;
  label?: string;
}>;

export function LoadingState({ accessibilityLabel, fill = true, label }: LoadingStateProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View accessibilityLabel={accessibilityLabel} style={fill ? styles.fill : styles.inline}>
      <ActivityIndicator color={colors.textPrimary} size="large" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    fill: { alignItems: "center", flex: 1, gap: sizes.spacing.section, justifyContent: "center" },
    inline: { alignItems: "center", gap: sizes.spacing.section },
    label: { color: colors.textSecondary, fontSize: fontSize.body },
  });
}
