import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";
import { fontSize } from "@/shared/presentation/typography";

type ScreenBackButtonProps = Readonly<{
  accessibilityLabel: string;
  onPress: () => void;
}>;

export function ScreenBackButton({ accessibilityLabel, onPress }: ScreenBackButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
    >
      <SymbolView
        name={{ android: "arrow_back", ios: "chevron.left", web: "arrow_back" }}
        size={sizes.icon.medium}
        tintColor={colors.textPrimary}
      />
      <Text style={[styles.label, { color: colors.textPrimary }]}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    flexDirection: "row",
    gap: sizes.spacing.xSmall,
    height: "100%",
    minWidth: sizes.touchTarget.minimum,
    paddingHorizontal: sizes.spacing.xSmall,
  },
  label: { fontSize: fontSize.body },
});
