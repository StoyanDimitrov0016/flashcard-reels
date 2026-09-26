import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Children, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import type { AppearancePreference } from "@/features/preferences/domain/app-preferences";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

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

type PreferenceSectionProps = Readonly<{
  children: ReactNode;
  title: string;
  /** Rows sit in one card with dividers. Controls with their own frame opt out. */
  grouped?: boolean;
}>;

export function PreferenceSection({ children, title, grouped = true }: PreferenceSectionProps) {
  const styles = createStyles(useAppTheme().colors);
  const rows = Children.toArray(children);

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {grouped ? (
        <View style={styles.group}>
          {rows.map((row, index) => (
            <View key={isValidElement(row) && row.key !== null ? row.key : index}>
              {index > 0 && <View style={styles.divider} />}
              {row}
            </View>
          ))}
        </View>
      ) : (
        rows
      )}
    </View>
  );
}

type PreferenceRowProps = Readonly<{
  detail?: string;
  disabled?: boolean;
  icon: SymbolViewProps["name"];
  iconColor?: string;
  onPress: () => void;
  title: string;
  tone?: "default" | "destructive";
}>;

export function PreferenceRow({
  detail,
  disabled = false,
  icon,
  iconColor,
  onPress,
  title,
  tone = "default",
}: PreferenceRowProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <SymbolView
        name={icon}
        size={sizes.icon.medium}
        tintColor={iconColor ?? colors.textSecondary}
      />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, tone === "destructive" && styles.destructiveTitle]}>
          {title}
        </Text>
        {!!detail && <Text style={styles.rowDetail}>{detail}</Text>}
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
    <View style={[styles.row, styles.switchRow]}>
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
    destructiveTitle: { color: colors.error },
    disabled: { opacity: 0.5 },
    pressed: { backgroundColor: colors.surfaceHover },
    divider: {
      backgroundColor: colors.borderSubtle,
      height: StyleSheet.hairlineWidth,
      // Inset past the icon, as in platform settings lists.
      marginLeft: sizes.spacing.xLarge + sizes.icon.medium + sizes.spacing.xLarge,
    },
    group: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      overflow: "hidden",
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.xLarge,
      minHeight: sizes.input.standard + sizes.spacing.xSmall,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.large,
    },
    rowCopy: { flex: 1, gap: sizes.spacing.xSmall },
    rowDetail: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
    },
    rowTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.bodyLarge,
      fontWeight: fontWeight.semibold,
    },
    section: { gap: sizes.spacing.medium },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.wider,
      paddingHorizontal: sizes.spacing.xSmall,
      textTransform: "uppercase",
    },
    segment: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      height: sizes.control.compact,
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
    // Android switches carry their own vertical touch padding.
    switchRow: { paddingVertical: 0 },
  });
}
