import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import type { AppearancePreference } from "@/features/preferences/domain/app-preferences";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

const appearanceLabels: Record<AppearancePreference, string> = {
  light: "Light",
  dark: "Dark",
  device: "Device",
};

const appearanceIcons: Record<AppearancePreference, SymbolViewProps["name"]> = {
  light: { android: "light_mode", ios: "sun.max.fill", web: "light_mode" },
  dark: { android: "dark_mode", ios: "moon.fill", web: "dark_mode" },
  device: { android: "devices", ios: "iphone", web: "devices" },
};

const appearanceOptions: readonly AppearancePreference[] = ["light", "dark", "device"];

type AppearanceSelectorProps = Readonly<{
  onChange: (value: AppearancePreference) => void;
  selected: AppearancePreference;
}>;

export function AppearanceSelector({ onChange, selected }: AppearanceSelectorProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View accessibilityRole="radiogroup" style={styles.segmentedControl}>
      {appearanceOptions.map((appearance) => {
        const isSelected = selected === appearance;
        return (
          <Pressable
            accessibilityLabel={appearanceLabels[appearance] + " appearance"}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, selected: isSelected }}
            hitSlop={4}
            key={appearance}
            onPress={() => onChange(appearance)}
            style={[styles.segment, isSelected && styles.segmentSelected]}
          >
            <View style={styles.segmentContent}>
              <SymbolView
                name={appearanceIcons[appearance]}
                size={16}
                tintColor={isSelected ? colors.textPrimary : colors.textSecondary}
              />
              <Text style={[styles.segmentLabel, isSelected && styles.segmentLabelSelected]}>
                {appearanceLabels[appearance]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

type PreferenceSectionProps = Readonly<{ children: ReactNode; title: string }>;

export function PreferenceSection({ children, title }: PreferenceSectionProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

type PreferenceRowProps = Readonly<{
  detail?: string;
  icon: SymbolViewProps["name"];
  iconColor?: string;
  onPress: () => void;
  title: string;
}>;

export function PreferenceRow({ detail, icon, iconColor, onPress, title }: PreferenceRowProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <SymbolView
        name={icon}
        size={sizes.icon.medium}
        tintColor={iconColor ?? colors.textSecondary}
      />
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <SymbolView
        name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
        size={sizes.icon.small}
        tintColor={colors.textTertiary}
      />
    </Pressable>
  );
}

type PreferenceSwitchProps = Readonly<{
  icon: SymbolViewProps["name"];
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}>;

export function PreferenceSwitch({ icon, label, onValueChange, value }: PreferenceSwitchProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.row}>
      <SymbolView name={icon} size={sizes.icon.medium} tintColor={colors.textSecondary} />
      <Text style={[styles.rowTitle, styles.switchLabel]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        onValueChange={onValueChange}
        thumbColor={value ? colors.actionPrimaryText : colors.textTertiary}
        trackColor={{ false: colors.borderStrong, true: colors.interactive }}
        value={value}
      />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    pressed: { opacity: 0.72 },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      minHeight: 64,
      paddingHorizontal: sizes.spacing.medium,
      paddingVertical: sizes.spacing.small,
    },
    rowCopy: { flex: 1, gap: sizes.spacing.xSmall },
    rowDetail: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
    },
    rowTitle: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.bold },
    section: { gap: sizes.spacing.small },
    sectionContent: { gap: sizes.spacing.xSmall },
    sectionTitle: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      textTransform: "uppercase",
    },
    segment: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      height: 36,
      paddingHorizontal: sizes.spacing.small,
    },
    segmentContent: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.xSmall },
    segmentLabel: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
    },
    segmentLabelSelected: { color: colors.textPrimary },
    segmentSelected: { backgroundColor: colors.surfaceHover, borderRadius: sizes.radius.medium },
    segmentedControl: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.medium,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.large,
      margin: 0,
      padding: sizes.spacing.xSmall,
    },
    switchLabel: { flex: 1 },
  });
}
