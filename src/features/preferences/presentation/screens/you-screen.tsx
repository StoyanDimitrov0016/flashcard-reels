import { useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import appIcon from "../../../../../assets/images/app-icon.png";

import {
  AppearanceSelector,
  PreferenceRow,
  PreferenceSection,
  PreferenceSwitch,
} from "@/features/preferences/presentation/components/preference-settings-components";
import { appMetadata } from "@/features/preferences/application/app-metadata";
import { ResetProgressSheet } from "@/features/learner-profile/presentation/components/reset-progress-sheet";
import { useLearnerProgress } from "@/features/learner-profile/presentation/hooks/use-learner-progress";
import { StudyControlsSheet } from "@/features/preferences/presentation/components/study-controls-sheet";
import { useHaptics } from "@/features/preferences/presentation/hooks/use-haptics";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

export default function YouScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const {
    preferences,
    setAppearance,
    setAudioEnabled,
    setAudioSide,
    setHapticsEnabled,
    setRatingDirection,
    setRecollectionIslandPosition,
  } = usePreferences();
  const [studyControlsPresented, setStudyControlsPresented] = useState(false);
  const [resetPresented, setResetPresented] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const { refresh, resetAllProgress } = useLearnerProgress();
  const haptics = useHaptics();

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          You
        </Text>
        <View style={styles.sections}>
          <PreferenceSection title="Appearance">
            <AppearanceSelector onChange={setAppearance} selected={preferences.appearance} />
          </PreferenceSection>
          <PreferenceSection title="Study Controls">
            <PreferenceRow
              detail={
                preferences.recollectionIslandPosition.charAt(0).toUpperCase() +
                preferences.recollectionIslandPosition.slice(1) +
                " · " +
                (preferences.ratingDirection === "forward" ? "Forward" : "Reverse")
              }
              icon={{ android: "tune", ios: "slider.horizontal.3", web: "tune" }}
              onPress={() => setStudyControlsPresented(true)}
              title="Study controls"
            />
          </PreferenceSection>
          <PreferenceSection title="Interaction">
            <PreferenceSwitch
              icon={{ android: "volume_up", ios: "speaker.wave.2.fill", web: "volume_up" }}
              label="Audio"
              onValueChange={setAudioEnabled}
              value={preferences.audioEnabled}
            />
            <PreferenceSwitch
              icon={{ android: "vibration", ios: "waveform.path.ecg", web: "vibration" }}
              label="Haptics"
              onValueChange={setHapticsEnabled}
              value={preferences.hapticsEnabled}
            />
          </PreferenceSection>
          <PreferenceSection title="Learning Data">
            <PreferenceRow
              detail="Installed decks stay available"
              icon={{ android: "restart_alt", ios: "arrow.counterclockwise", web: "restart_alt" }}
              onPress={() => {
                setResetError(null);
                setResetPresented(true);
              }}
              title="Reset all learning progress"
            />
          </PreferenceSection>
          <PreferenceSection title="About">
            <View style={styles.aboutRow}>
              <Image accessibilityIgnoresInvertColors source={appIcon} style={styles.aboutIcon} />
              <View style={styles.aboutCopy}>
                <Text style={styles.rowTitle}>Flashcard Reels</Text>
                <Text style={styles.rowDetail}>Version {appMetadata.version}</Text>
              </View>
            </View>
            <PreferenceRow
              detail="View source on GitHub"
              icon={{ android: "code", ios: "curlybraces", web: "code" }}
              onPress={openRepository}
              title="Open repository"
            />
          </PreferenceSection>
        </View>
      </ScrollView>
      <ResetProgressSheet
        busy={resetting}
        error={resetError}
        isPresented={resetPresented}
        onCancel={() => {
          if (!resetting) {
            setResetPresented(false);
          }
        }}
        onConfirm={() => {
          if (resetting) {
            return;
          }
          setResetting(true);
          void resetAllProgress()
            .then(() => {
              refresh();
              haptics.resetCompleted();
              setResetPresented(false);
            })
            .catch(() =>
              setResetError("The reset could not be completed. Your progress was not changed.")
            )
            .finally(() => setResetting(false));
        }}
        scope="all learning progress"
      />
      <StudyControlsSheet
        onAudioSideChange={setAudioSide}
        onClose={() => setStudyControlsPresented(false)}
        onPositionChange={setRecollectionIslandPosition}
        onRatingDirectionChange={setRatingDirection}
        preferences={preferences}
        visible={studyControlsPresented}
      />
    </SafeAreaView>
  );
}

function openRepository() {
  if (appMetadata.repositoryUrl) {
    void Linking.openURL(appMetadata.repositoryUrl).catch(() => undefined);
  }
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    aboutCopy: { flex: 1, gap: sizes.spacing.xSmall },
    aboutIcon: {
      borderRadius: sizes.radius.medium,
      height: 44,
      width: 44,
    },
    aboutRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      padding: sizes.spacing.medium,
    },
    content: {
      gap: sizes.spacing.section,
      padding: sizes.spacing.content,
      paddingBottom: sizes.spacing.spacious,
    },
    rowDetail: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
    },
    rowTitle: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.bold },
    screen: { backgroundColor: colors.background, flex: 1 },
    sections: { gap: sizes.spacing.spacious },
    title: { color: colors.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy },
  });
}
