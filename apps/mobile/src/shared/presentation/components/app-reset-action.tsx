import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { requestAppDataReset } from "@/infrastructure/app-recovery";
import { toError } from "@/shared/errors/normalize-error";
import { ErrorDetails } from "@/shared/presentation/components/error-details";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";
import { reportError } from "@/shared/presentation/errors/report-error";
import { getAppColors, type AppColors } from "@/shared/presentation/theme-colors";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize } from "@/shared/presentation/typography";

export function AppResetAction() {
  const colors = getAppColors(useColorScheme() === "dark" ? "dark" : "light");
  const styles = createStyles(colors);
  const [confirming, setConfirming] = useState(false);
  const [requested, setRequested] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);

  if (Platform.OS === "web") {
    return (
      <Text style={styles.text}>
        To fully reset the web app, clear this site's storage in browser settings.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {requested ? (
        <Text accessibilityRole="alert" selectable style={styles.text}>
          Reset scheduled.{" "}
          {Platform.OS === "android"
            ? "Force stop the app in Android Settings, then reopen it."
            : "Remove the app from recent apps, then reopen it."}{" "}
          Local data will be erased and bundled decks restored.
        </Text>
      ) : (
        <>
          {confirming && (
            <Text style={styles.text}>
              Erase decks, audio, progress and settings on the next launch? Bundled decks will
              return. This cannot be undone.
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              try {
                requestAppDataReset();
                setRequested(true);
                setFailure(null);
              } catch (error) {
                const normalized = toError(error, "The app-data reset could not be scheduled");
                reportError(normalized, "App reset request failure");
                setFailure(normalized);
              }
            }}
            style={styles.button}
          >
            <Text style={styles.label}>
              {confirming ? "Confirm full reset" : "Reset all app data"}
            </Text>
          </Pressable>
          {confirming && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirming(false)}
              style={styles.button}
            >
              <Text style={styles.text}>Cancel</Text>
            </Pressable>
          )}
        </>
      )}
      {!!failure && (
        <>
          <Text accessibilityRole="alert" style={styles.text}>
            {getErrorFeedback(failure).message} You can clear app storage in device settings
            instead.
          </Text>
          <ErrorDetails error={failure} />
        </>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      gap: sizes.spacing.medium,
      padding: sizes.spacing.medium,
    },
    button: {
      minHeight: sizes.touchTarget.minimum,
      justifyContent: "center",
      padding: sizes.spacing.medium,
    },
    label: { color: colors.error, fontSize: fontSize.body },
    text: { color: colors.textPrimary, fontSize: fontSize.body },
  });
}
