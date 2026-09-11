import Constants from "expo-constants";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { AppearancePreference } from "@/features/preferences/domain/app-preferences";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

const appearanceOptions: readonly AppearancePreference[] = ["light", "dark", "device"];
const appearanceLabels: Record<AppearancePreference, string> = {
  light: "Light",
  dark: "Dark",
  device: "Device",
};

export default function YouScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { preferences, setAppearance, setAudioEnabled, setHapticsEnabled } = usePreferences();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>You</Text>
        <Text style={styles.subtitle}>All your preferences in one place.</Text>
        <PreferenceSection title="Study Controls">
          <PreferenceRow
            detail={
              preferences.recollectionIslandPosition.charAt(0).toUpperCase() +
              preferences.recollectionIslandPosition.slice(1) +
              " · " +
              (preferences.ratingDirection === "forward" ? "Forward" : "Reverse")
            }
            icon={{ android: "tune", ios: "slider.horizontal.3", web: "tune" }}
            onPress={() => undefined}
            title="Study controls"
          />
        </PreferenceSection>
        <PreferenceSection title="Appearance">
          <View accessibilityRole="radiogroup" style={styles.segmentedControl}>
            {appearanceOptions.map((appearance) => {
              const selected = preferences.appearance === appearance;
              return (
                <Pressable
                  accessibilityLabel={appearanceLabels[appearance] + " appearance"}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, selected }}
                  key={appearance}
                  onPress={() => setAppearance(appearance)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
                    {appearanceLabels[appearance]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </PreferenceSection>
        <PreferenceSection title="Interaction">
          <PreferenceSwitch icon={{ android: "volume_up", ios: "speaker.wave.2.fill", web: "volume_up" }} label="Audio" onValueChange={setAudioEnabled} value={preferences.audioEnabled} />
          <PreferenceSwitch icon={{ android: "vibration", ios: "waveform.path.ecg", web: "vibration" }} label="Haptics" onValueChange={setHapticsEnabled} value={preferences.hapticsEnabled} />
        </PreferenceSection>
        <PreferenceSection title="Learning Data">
          <PreferenceRow
            detail="Installed decks stay available"
            icon={{ android: "restart_alt", ios: "arrow.counterclockwise", web: "restart_alt" }}
            onPress={() => undefined}
            title="Reset all learning progress"
          />
        </PreferenceSection>
        <PreferenceSection title="About">
          <View style={styles.aboutRow}>
            <View style={styles.aboutIcon}><Text style={styles.aboutIconLabel}>JS</Text></View>
            <View style={styles.aboutCopy}>
              <Text style={styles.rowTitle}>Flashcard Reels</Text>
              <Text style={styles.rowDetail}>Version {version}</Text>
            </View>
          </View>
          <PreferenceRow detail="Built for open learning" icon={{ android: "code", ios: "curlybraces", web: "code" }} onPress={() => undefined} title="Open source" />
        </PreferenceSection>
      </ScrollView>
    </SafeAreaView>
  );
}

type PreferenceSectionProps = Readonly<{ children: React.ReactNode; title: string }>;
function PreferenceSection({ children, title }: PreferenceSectionProps) {
  const styles = createStyles(useAppTheme().colors);
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

type PreferenceRowProps = Readonly<{ detail: string; icon: SymbolViewProps["name"]; onPress: () => void; title: string }>;
function PreferenceRow({ detail, icon, onPress, title }: PreferenceRowProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <Pressable accessibilityLabel={title} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <SymbolView name={icon} size={sizes.icon.medium} tintColor={colors.textSecondary} />
      <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View>
      <SymbolView name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }} size={sizes.icon.small} tintColor={colors.textMuted} />
    </Pressable>
  );
}

type PreferenceSwitchProps = Readonly<{ icon: SymbolViewProps["name"]; label: string; onValueChange: (value: boolean) => void; value: boolean }>;
function PreferenceSwitch({ icon, label, onValueChange, value }: PreferenceSwitchProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      <SymbolView name={icon} size={sizes.icon.medium} tintColor={colors.textSecondary} />
      <Text style={[styles.rowTitle, styles.switchLabel]}>{label}</Text>
      <Switch accessibilityLabel={label} accessibilityRole="switch" accessibilityState={{ checked: value }} onValueChange={onValueChange} thumbColor={value ? colors.actionPrimaryText : colors.textMuted} trackColor={{ false: colors.borderStrong, true: colors.accent }} value={value} />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    aboutCopy: { flex: 1, gap: sizes.spacing.xSmall },
    aboutIcon: { alignItems: "center", backgroundColor: colors.actionPrimary, borderRadius: sizes.radius.medium, height: 44, justifyContent: "center", width: 44 },
    aboutIconLabel: { color: colors.actionPrimaryText, fontWeight: fontWeight.heavy },
    aboutRow: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.medium, padding: sizes.spacing.medium },
    content: { gap: sizes.spacing.section, padding: sizes.spacing.content, paddingBottom: sizes.spacing.spacious },
    pressed: { opacity: 0.72 },
    row: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.medium, minHeight: 64, paddingHorizontal: sizes.spacing.medium, paddingVertical: sizes.spacing.small },
    rowCopy: { flex: 1, gap: sizes.spacing.xSmall },
    rowDetail: { color: colors.textSecondary, fontSize: fontSize.caption, lineHeight: lineHeight.footnote },
    rowTitle: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.bold },
    screen: { backgroundColor: colors.background, flex: 1 },
    section: { gap: sizes.spacing.small },
    sectionBody: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: sizes.radius.row, borderWidth: sizes.border, overflow: "hidden" },
    sectionTitle: { color: colors.textMuted, fontSize: fontSize.caption, fontWeight: fontWeight.bold, textTransform: "uppercase" },
    segment: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 46, paddingHorizontal: sizes.spacing.small },
    segmentLabel: { color: colors.textSecondary, fontSize: fontSize.caption, fontWeight: fontWeight.bold },
    segmentLabelSelected: { color: colors.textPrimary },
    segmentSelected: { backgroundColor: colors.controlSelected, borderRadius: sizes.radius.medium },
    segmentedControl: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: sizes.radius.medium, borderWidth: sizes.border, flexDirection: "row", gap: sizes.spacing.xSmall, margin: sizes.spacing.medium, padding: sizes.spacing.xSmall },
    subtitle: { color: colors.textSecondary, fontSize: fontSize.body },
    switchLabel: { flex: 1 },
    title: { color: colors.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy },
  });
}
