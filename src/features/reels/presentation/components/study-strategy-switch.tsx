import { Pressable, StyleSheet, Text, View } from "react-native";

import type { StudySessionStrategy } from "@/features/study/domain/study-session-strategy";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

type StudyStrategySwitchProps = Readonly<{
  onChange: (strategy: StudySessionStrategy) => void;
  value: StudySessionStrategy;
}>;

const options: ReadonlyArray<Readonly<{ label: string; value: StudySessionStrategy }>> = [
  { label: "Shuffle", value: "shuffle" },
  { label: "Ordered", value: "ordered" },
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
    justifyContent: "center",
    minHeight: 40,
  },
  pressedOption: { backgroundColor: palette.controlPressed },
  selectedLabel: { color: palette.textPrimary, fontWeight: fontWeight.bold },
  selectedOption: { backgroundColor: palette.controlSelected },
});
