import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { toError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";
import { AppResetScheduledSheet } from "@/shared/presentation/components/app-reset-scheduled-sheet";
import { DestructiveConfirmationSheet } from "@/shared/presentation/components/destructive-confirmation-sheet";
import { useAppRecovery } from "@/shared/presentation/context/app-recovery-context";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";
import { sizes } from "@/shared/presentation/sizes";
import { getAppColors, type AppColors } from "@/shared/presentation/theme-colors";
import { fontSize } from "@/shared/presentation/typography";

export function AppResetAction() {
  const { requestAppDataReset } = useAppRecovery();
  const colors = getAppColors(useColorScheme() === "dark" ? "dark" : "light");
  const styles = createStyles(colors);
  const [confirmationPresented, setConfirmationPresented] = useState(false);
  const [scheduledPresented, setScheduledPresented] = useState(false);
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
    <>
      {!requested && (
        <View style={styles.container}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setFailure(null);
              setConfirmationPresented(true);
            }}
            style={styles.button}
          >
            <Text style={styles.label}>Reset all app data</Text>
          </Pressable>
        </View>
      )}
      <DestructiveConfirmationSheet
        actionLabel="Reset app data"
        busy={false}
        error={
          failure
            ? `${getErrorFeedback(failure).message} You can clear app storage in device settings instead.`
            : null
        }
        icon="trash"
        message="Erase decks, audio, progress and settings on the next launch? Bundled decks will return. This cannot be undone."
        onCancel={() => {
          setConfirmationPresented(false);
          setFailure(null);
        }}
        onConfirm={() => {
          try {
            requestAppDataReset();
            setRequested(true);
            setFailure(null);
            setConfirmationPresented(false);
            setScheduledPresented(true);
          } catch (error) {
            const normalized = toError(error, "The app-data reset could not be scheduled");
            reportError(normalized, "App reset request failure");
            setFailure(normalized);
          }
        }}
        title="Reset all app data?"
        visible={confirmationPresented}
      />
      <AppResetScheduledSheet
        onClose={() => setScheduledPresented(false)}
        visible={scheduledPresented}
      />
    </>
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
