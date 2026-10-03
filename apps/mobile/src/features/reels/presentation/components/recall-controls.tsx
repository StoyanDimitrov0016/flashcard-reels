import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Rating } from "@/features/learning-engine/domain/rating";

import { useHaptics } from "@/features/preferences/presentation/controllers/use-haptics";
import { useStudyControlLayout } from "@/features/reels/presentation/context/study-control-layout-context";
import { recallOptions } from "@/features/reels/presentation/recall-options";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

type RecallControlsProps = Readonly<{
  onSelect: (rating: Rating) => void;
  ratingEnabled: boolean;
  selectedRating: Rating | null;
}>;

export function RecallControls({ onSelect, ratingEnabled, selectedRating }: RecallControlsProps) {
  const { orientation, ratingOrder } = useStudyControlLayout();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, orientation);
  const haptics = useHaptics();
  const orderedOptions = ratingOrder.flatMap((rating) =>
    recallOptions.filter((option) => option.rating === rating)
  );

  return (
    <View style={styles.island}>
      {orderedOptions.map(({ color: colorName, label, rating, symbol }) => {
        const color = colors[colorName];
        const selected = rating === selectedRating;
        return (
          <Pressable
            accessibilityLabel={"Recall rating: " + label}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ratingEnabled, selected }}
            disabled={!ratingEnabled}
            key={rating}
            onPress={() => {
              haptics.ratingSelected();
              onSelect(rating);
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
      // A bottom island shares the row with the audio and reading buttons: it takes the room
      // left over, up to a width where the four ratings still sit close together.
      ...(orientation === "horizontal"
        ? {
            flexBasis: 0,
            flexGrow: 1,
            flexShrink: 1,
            maxWidth: sizes.study.horizontalIslandMaxWidth,
          }
        : {}),
    },
    action: {
      alignItems: "center",
      flex: orientation === "horizontal" ? 1 : undefined,
      gap: sizes.spacing.xSmall,
      minWidth: orientation === "horizontal" ? sizes.touchTarget.minimum : undefined,
    },
    iconCircle: {
      alignItems: "center",
      borderRadius: sizes.radius.pill,
      height: sizes.study.recallIcon,
      justifyContent: "center",
      overflow: "hidden",
      width: sizes.study.recallIcon,
    },
    label: { fontSize: fontSize.micro, fontWeight: fontWeight.bold },
  });
}
