import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";

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
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ android: "arrow_back", ios: "chevron.left", web: "arrow_back" }}
        size={sizes.icon.medium}
        tintColor={colors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    height: sizes.touchTarget.minimum,
    justifyContent: "center",
    // Lines the arrow up with the screen gutter.
    marginLeft: -sizes.spacing.medium,
    width: sizes.touchTarget.minimum,
  },
  pressed: { opacity: 0.6 },
});
