import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ResetProgressSheet } from "@/features/flashcard-progress/presentation/components/reset-progress-sheet";
import { useResetAllProgress } from "@/features/flashcard-progress/presentation/controllers/use-reset-all-progress";
import { appMetadata } from "@/features/preferences/presentation/app-metadata";
import {
  ColorModeSelector,
  PreferenceRow,
  PreferenceSection,
  PreferenceSwitch,
} from "@/features/preferences/presentation/components/preference-settings-components";
import { StudyControlsSheet } from "@/features/preferences/presentation/components/study-controls-sheet";
import { useHaptics } from "@/features/preferences/presentation/controllers/use-haptics";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { reportError } from "@/shared/errors/report-error";
import { AppResetAction } from "@/shared/presentation/components/app-reset-action";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { useTabBarInset } from "@/shared/presentation/context/tab-bar-inset-context";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";
import { showErrorToast } from "@/shared/presentation/flashcard-toast";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

import appIcon from "../../../../../assets/images/app-icon.png";

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const tabBarInset = useTabBarInset();
  const router = useRouter();
  const {
    preferences,
    storageError,
    setColorMode,
    setAudioEnabled,
    setAudioSide,
    setHapticsEnabled,
    setReadingEnabled,
    setReadingSide,
    setRatingDirection,
    setStudyIslandPosition,
  } = usePreferences();
  const [studyControlsPresented, setStudyControlsPresented] = useState(false);
  const [resetPresented, setResetPresented] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const { resetAllProgress } = useResetAllProgress();
  const haptics = useHaptics();

  useEffect(
    function announceStorageFailure() {
      if (storageError !== null) {
        showErrorToast(getErrorFeedback(storageError).message);
      }
    },
    [storageError]
  );

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScreenHeader>
        <Text accessibilityRole="header" style={styles.title}>
          Settings
        </Text>
      </ScreenHeader>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: sizes.spacing.spacious + tabBarInset },
        ]}
      >
        <View style={styles.sections}>
          <PreferenceSection grouped={false} title="Color mode">
            <ColorModeSelector onChange={setColorMode} selected={preferences.colorMode} />
          </PreferenceSection>
          <PreferenceSection title="Interaction">
            <PreferenceRow
              detail={
                preferences.studyIslandPosition.charAt(0).toUpperCase() +
                preferences.studyIslandPosition.slice(1) +
                ", " +
                (preferences.ratingDirection === "forward" ? "forward ratings" : "reverse ratings")
              }
              icon={{ android: "tune", ios: "slider.horizontal.3", web: "tune" }}
              onPress={() => setStudyControlsPresented(true)}
              title="Study island"
            />
            <PreferenceSwitch
              icon={{ android: "volume_up", ios: "speaker.wave.2.fill", web: "volume_up" }}
              label="Audio"
              onValueChange={setAudioEnabled}
              value={preferences.audioEnabled}
            />
            <PreferenceSwitch
              icon={{ android: "menu_book", ios: "book", web: "menu_book" }}
              label="Reading"
              onValueChange={setReadingEnabled}
              value={preferences.readingEnabled}
            />
            <PreferenceSwitch
              icon={{ android: "vibration", ios: "waveform.path.ecg", web: "vibration" }}
              label="Haptics"
              onValueChange={setHapticsEnabled}
              value={preferences.hapticsEnabled}
            />
          </PreferenceSection>
          <PreferenceSection title="Data">
            <PreferenceRow
              icon={{ android: "save", ios: "square.and.arrow.up", web: "save" }}
              onPress={() => router.push("../progress-backup")}
              title="Progress backup"
            />
            <PreferenceRow
              icon={{ android: "restart_alt", ios: "arrow.counterclockwise", web: "restart_alt" }}
              iconColor={colors.error}
              onPress={() => {
                setResetError(null);
                setResetPresented(true);
              }}
              title="Reset all learning progress"
              tone="destructive"
            />
            <AppResetAction
              renderTrigger={(open) => (
                <PreferenceRow
                  icon={{ android: "delete_forever", ios: "trash", web: "delete_forever" }}
                  iconColor={colors.error}
                  onPress={open}
                  title="Reset all app data"
                  tone="destructive"
                />
              )}
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
              haptics.resetCompleted();
              setResetPresented(false);
            })
            .catch((error: unknown) => {
              reportError(error, "Learning progress reset failure");
              setResetError(getErrorFeedback(error).message);
              setResetPresented(true);
            })
            .finally(() => setResetting(false));
        }}
        scope="all learning progress"
      />
      <StudyControlsSheet
        onAudioSideChange={setAudioSide}
        onClose={() => setStudyControlsPresented(false)}
        onPositionChange={setStudyIslandPosition}
        onRatingDirectionChange={setRatingDirection}
        onReadingSideChange={setReadingSide}
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
      height: sizes.touchTarget.minimum,
      width: sizes.touchTarget.minimum,
    },
    aboutRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.xLarge,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.large,
    },
    content: {
      gap: sizes.spacing.section,
      paddingHorizontal: sizes.spacing.content,
      paddingBottom: sizes.spacing.spacious,
      paddingTop: screenLayout.contentTopGap,
    },
    rowDetail: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
    },
    rowTitle: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.bold },
    screen: { backgroundColor: colors.canvas, flex: 1 },
    sections: { gap: sizes.spacing.spacious },
    title: { color: colors.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy },
  });
}
