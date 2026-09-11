import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { recallOptions } from "@/features/reels/presentation/recall-options";
import { useStudyControlLayout } from "@/features/reels/presentation/context/study-control-layout-context";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import { useHaptics } from "@/features/preferences/presentation/hooks/use-haptics";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

type RecallControlsProps = Readonly<{
  onSelect: (level: RecallLevel) => void;
  selectedLevel: RecallLevel | null;
}>;

const HORIZONTAL_RECALL_ACTION_MIN_WIDTH = 44;

export function RecallControls({ onSelect, selectedLevel }: RecallControlsProps) {
  const { orientation, ratingOrder } = useStudyControlLayout();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, orientation);
  const haptics = useHaptics();
  const orderedOptions = ratingOrder.flatMap((level) =>
    recallOptions.filter((option) => option.level === level)
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
              haptics.ratingSelected();
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
      backgroundColor: colors.studyIslandSurface,
      borderColor: colors.studyIslandBorder,
      borderRadius: sizes.radius.island,
      borderWidth: sizes.border,
      flexDirection: orientation === "horizontal" ? "row" : "column",
      gap: orientation === "horizontal" ? 0 : sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.medium,
      paddingVertical: sizes.spacing.medium,
    },
    action: {
      alignItems: "center",
      gap: sizes.spacing.xSmall,
      minWidth: orientation === "horizontal" ? HORIZONTAL_RECALL_ACTION_MIN_WIDTH : undefined,
    },
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
