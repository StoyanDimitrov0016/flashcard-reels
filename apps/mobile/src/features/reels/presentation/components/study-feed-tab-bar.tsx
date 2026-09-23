import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing } from "@/shared/presentation/typography";

export type StudyFeedTab = Readonly<{
  key: string;
  label: string;
  accessibilityLabel: string;
}>;

const tabBarHeight = 44;
const indicatorWidth = 18;
const indicatorHeight = 2;

type StudyFeedTabBarProps = Readonly<{
  tabs: readonly StudyFeedTab[];
  activeKey: string;
  onSelect: (key: string) => void;
}>;

export function StudyFeedTabBar({ tabs, activeKey, onSelect }: StudyFeedTabBarProps) {
  const { colors } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const styles = createStyles(colors);

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingTop: top }]}>
      {tabs.map((tab) => (
        <StudyFeedTabButton
          active={tab.key === activeKey}
          colors={colors}
          key={tab.key}
          onSelect={onSelect}
          tab={tab}
        />
      ))}
    </View>
  );
}

type StudyFeedTabButtonProps = Readonly<{
  active: boolean;
  colors: AppColors;
  onSelect: (key: string) => void;
  tab: StudyFeedTab;
}>;

function StudyFeedTabButton({ active, colors, onSelect, tab }: StudyFeedTabButtonProps) {
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityLabel={tab.accessibilityLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      hitSlop={sizes.spacing.medium}
      onPress={() => onSelect(tab.key)}
      style={styles.tab}
    >
      <Text style={[styles.label, active ? styles.activeLabel : styles.inactiveLabel]}>
        {tab.label}
      </Text>
      <View style={[styles.indicator, active && styles.activeIndicator]} />
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    activeIndicator: { backgroundColor: colors.textPrimary },
    activeLabel: { color: colors.textPrimary },
    bar: {
      alignItems: "center",
      backgroundColor: colors.canvas,
      flexDirection: "row",
      gap: sizes.spacing.wide,
      justifyContent: "center",
    },
    inactiveLabel: { color: colors.textTertiary },
    indicator: {
      backgroundColor: "transparent",
      borderRadius: sizes.radius.small,
      height: indicatorHeight,
      marginTop: sizes.spacing.small,
      width: indicatorWidth,
    },
    label: {
      fontSize: fontSize.callout,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.wide,
    },
    tab: {
      alignItems: "center",
      height: tabBarHeight,
      justifyContent: "center",
      minWidth: sizes.touchTarget.minimum,
    },
  });
}
