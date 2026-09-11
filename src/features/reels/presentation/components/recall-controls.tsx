import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { deriveRatingOrder } from "@/features/reels/presentation/study-control-layout";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import { selectAction } from "@/shared/presentation/haptics";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

type RecallOption = Readonly<{
  color: keyof Pick<AppColors, "danger" | "warning" | "success" | "recallEasy">;
  label: string;
  level: RecallLevel;
  symbol: SymbolViewProps["name"];
}>;

const recallOptions: readonly RecallOption[] = [
  { color: "danger", label: "Again", level: "again", symbol: { android: "replay", ios: "arrow.counterclockwise", web: "replay" } },
  { color: "warning", label: "Hard", level: "hard", symbol: { android: "speed", ios: "tortoise.fill", web: "speed" } },
  { color: "success", label: "Good", level: "good", symbol: { android: "check_circle", ios: "checkmark.circle.fill", web: "check_circle" } },
  { color: "recallEasy", label: "Easy", level: "easy", symbol: { android: "bolt", ios: "bolt.fill", web: "bolt" } },
];

type RecallControlsProps = Readonly<{
  onSelect: (level: RecallLevel) => void;
  orientation?: "horizontal" | "vertical";
  ratingOrder?: readonly RecallLevel[];
  selectedLevel: RecallLevel | null;
}>;

export function RecallControls({
  onSelect,
  orientation = "vertical",
  ratingOrder = deriveRatingOrder("forward"),
  selectedLevel,
}: RecallControlsProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors, orientation);
  const orderedOptions = ratingOrder.map(
    (level) => recallOptions.find((option) => option.level === level)!
  );

  return (
    <View style={styles.island}>
      {orderedOptions.map(({ color: colorName, label, level, symbol }) => {
        const color = colors[colorName];
        const selected = level === selectedLevel;
        return (
          <Pressable
            accessibilityLabel={"Recall level: " + label}
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
                tintColor={selected ? colors.actionPrimaryText : color}
              />
            </View>
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: AppColors, orientation: "horizontal" | "vertical") {
  return StyleSheet.create({
    island: {
      backgroundColor: colors.controlOverlay,
      borderColor: colors.controlBorder,
      borderRadius: sizes.radius.island,
      borderWidth: sizes.border,
      flexDirection: orientation === "horizontal" ? "row" : "column",
      gap: sizes.spacing.xxLarge,
      paddingHorizontal: sizes.spacing.medium,
      paddingVertical: sizes.spacing.xxLarge,
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
    label: { fontSize: fontSize.micro, fontWeight: fontWeight.bold },
  });
}
