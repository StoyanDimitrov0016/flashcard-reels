import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RecallLevel } from "@/features/study/domain/recall-level";
import { palette } from "@/shared/presentation/palette";
import { selectAction } from "@/shared/presentation/haptics";
import { sizes } from "@/shared/presentation/sizes";

type RecallOption = Readonly<{
  color: string;
  label: string;
  level: RecallLevel;
  symbol: SymbolViewProps["name"];
}>;

const recallOptions: RecallOption[] = [
  {
    color: palette.danger,
    label: "Again",
    level: "again",
    symbol: { android: "replay", ios: "arrow.counterclockwise", web: "replay" },
  },
  {
    color: palette.warning,
    label: "Hard",
    level: "hard",
    symbol: { android: "speed", ios: "tortoise.fill", web: "speed" },
  },
  {
    color: palette.success,
    label: "Good",
    level: "good",
    symbol: { android: "check_circle", ios: "checkmark.circle.fill", web: "check_circle" },
  },
  {
    color: palette.easy,
    label: "Easy",
    level: "easy",
    symbol: { android: "bolt", ios: "bolt.fill", web: "bolt" },
  },
];

type RecallControlsProps = Readonly<{
  onSelect: (level: RecallLevel) => void;
  selectedLevel: RecallLevel | null;
}>;

export function RecallControls({ onSelect, selectedLevel }: RecallControlsProps) {
  return (
    <View style={styles.island}>
      {recallOptions.map(({ color, label, level, symbol }) => {
        const selected = level === selectedLevel;
        return (
          <Pressable
            accessibilityLabel={`Recall level: ${label}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={level}
            onPress={() => {
              selectAction();
              onSelect(level);
            }}
            style={styles.action}
          >
            <View style={[styles.iconCircle, selected && { backgroundColor: color }]}>
              <SymbolView
                name={symbol}
                size={sizes.icon.medium}
                tintColor={selected ? palette.ink : color}
              />
            </View>
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  island: {
    backgroundColor: palette.controlOverlay,
    borderColor: palette.controlBorder,
    borderRadius: sizes.radius.island,
    borderWidth: sizes.border,
    gap: sizes.spacing.xxLarge,
    paddingHorizontal: sizes.spacing.medium,
    paddingVertical: sizes.spacing.xxLarge,
    position: "absolute",
    right: sizes.spacing.section,
    top: "32%",
  },
  action: { alignItems: "center", gap: sizes.spacing.xSmall },
  iconCircle: {
    alignItems: "center",
    borderRadius: sizes.radius.pill,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  label: { fontSize: 9, fontWeight: "700" },
});
