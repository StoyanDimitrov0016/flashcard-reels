import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

const SEGMENT_ICON_SIZE = 16;

export type SegmentedControlOption<TValue extends string> = Readonly<{
  value: TValue;
  label: string;
  accessibilityLabel?: string;
  icon?: SymbolViewProps["name"];
}>;

type SegmentedControlProps<TValue extends string> = Readonly<{
  options: readonly SegmentedControlOption<TValue>[];
  selected: TValue;
  onChange: (value: TValue) => void;
}>;

/** A row of mutually exclusive choices, framed like the grouped setting cards. */
export function SegmentedControl<TValue extends string>({
  onChange,
  options,
  selected,
}: SegmentedControlProps<TValue>) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View accessibilityRole="radiogroup" style={styles.control}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, selected: isSelected }}
            hitSlop={4}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, isSelected && styles.segmentSelected]}
          >
            <View style={styles.segmentContent}>
              {option.icon && (
                <SymbolView
                  name={option.icon}
                  size={SEGMENT_ICON_SIZE}
                  tintColor={isSelected ? colors.textPrimary : colors.textSecondary}
                />
              )}
              <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    control: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.large,
      margin: 0,
      padding: sizes.spacing.xSmall,
    },
    label: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
    },
    labelSelected: { color: colors.textPrimary },
    segment: {
      alignItems: "center",
      flex: 1,
      height: sizes.control.compact,
      justifyContent: "center",
      paddingHorizontal: sizes.spacing.small,
    },
    segmentContent: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.xSmall },
    segmentSelected: {
      backgroundColor: colors.surfaceHover,
      // Concentric with the frame's corner.
      borderRadius: sizes.radius.row - sizes.spacing.xSmall,
    },
  });
}
