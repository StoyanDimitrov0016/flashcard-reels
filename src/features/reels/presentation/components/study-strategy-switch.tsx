import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { StudySessionStrategy } from "@/features/study/domain/study-session-strategy";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

type StudyStrategySwitchProps = Readonly<{
  onChange: (strategy: StudySessionStrategy) => void;
  value: StudySessionStrategy;
}>;

const options: ReadonlyArray<
  Readonly<{ label: string; symbol: SymbolViewProps["name"]; value: StudySessionStrategy }>
> = [
  {
    label: "Shuffle",
    symbol: { android: "shuffle", ios: "shuffle", web: "shuffle" },
    value: "shuffle",
  },
  {
    label: "Ordered",
    symbol: { android: "view_list", ios: "list.bullet", web: "view_list" },
    value: "ordered",
  },
];

export function StudyStrategySwitch({ onChange, value }: StudyStrategySwitchProps) {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selectedOption,
              pressed && styles.pressedOption,
            ]}
          >
            <SymbolView
              name={option.symbol}
              size={sizes.icon.small}
              tintColor={selected ? palette.textPrimary : palette.textMuted}
            />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface,
    borderColor: palette.controlBorder,
    borderRadius: sizes.radius.medium,
    borderWidth: sizes.border,
    flexDirection: "row",
    gap: sizes.spacing.xSmall,
    padding: sizes.spacing.xSmall,
  },
  label: {
    color: palette.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  option: {
    alignItems: "center",
    borderRadius: sizes.radius.small,
    flex: 1,
    flexDirection: "row",
    gap: sizes.spacing.small,
    justifyContent: "center",
    minHeight: 32,
  },
  pressedOption: { backgroundColor: palette.controlPressed },
  selectedLabel: { color: palette.textPrimary, fontWeight: fontWeight.bold },
  selectedOption: { backgroundColor: palette.controlSelected },
});
