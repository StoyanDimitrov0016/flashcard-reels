import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import {
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps as ExpoErrorBoundaryProps,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PreferencesProvider } from "@/features/preferences/presentation/controllers/preferences-context";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { PreferencesThemeProvider } from "@/features/preferences/presentation/preferences-theme-provider";
import { DeckContentProvider } from "@/features/decks/presentation/context/deck-content-context";
import { LearningProgressResetProvider } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { FlashcardToastHost } from "@/shared/presentation/flashcard-toast";
import { GlobalErrorState } from "@/shared/presentation/components/global-error-state";
import { AppRecoveryProvider } from "@/shared/presentation/context/app-recovery-context";
import { StartupLoadingState } from "@/shared/presentation/components/startup-loading-state";
import { ViewErrorBoundary } from "@/shared/presentation/components/view-error-boundary";
import { getRouterTheme, useAppTheme } from "@/shared/presentation/theme";
import { AppServicesProvider } from "@/infrastructure/app-services";
import { preferencesService } from "@/infrastructure/preferences-services";
import {
  DATABASE_NAME,
  handleSQLiteProviderError,
  initializeDatabase,
} from "@/infrastructure/sqlite/database";
import { prepareAppStorage, requestAppDataReset } from "@/infrastructure/app-recovery";
import { toError } from "@/shared/errors/normalize-error";
import { getAppColors } from "@/shared/presentation/theme-colors";
// oxlint-disable-next-line import/no-unassigned-import -- Expo Router loads this only on web.
import "../../global.css";

const appRecoveryCapability = { requestAppDataReset };

type ErrorBoundaryProps = Readonly<ExpoErrorBoundaryProps>;

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <AppRecoveryProvider capability={appRecoveryCapability}>
      <GlobalErrorState error={error} retry={retry} />
    </AppRecoveryProvider>
  );
}

export function SuspenseFallback() {
  const colors = getAppColors(useColorScheme() === "dark" ? "dark" : "light");

  return (
    <SafeAreaView style={[styles.fallbackScreen, { backgroundColor: colors.canvas }]}>
      <ActivityIndicator color={colors.textPrimary} size="large" />
      <Text style={{ color: colors.textPrimary }}>Starting the app…</Text>
    </SafeAreaView>
  );
}

export const unstable_settings = { screenErrorBoundary: ViewErrorBoundary };

function AppNavigation() {
  const { colors, resolvedScheme } = useAppTheme();
  const { ready } = usePreferences();

  useEffect(
    function synchronizeNativeRootBackground() {
      void SystemUI.setBackgroundColorAsync(colors.canvas).catch(() => undefined);
    },
    [colors.canvas]
  );

  if (!ready) {
    return <StartupLoadingState label="Loading your preferences…" />;
  }

  return (
    <ThemeProvider value={getRouterTheme(resolvedScheme, colors)}>
      <View style={[styles.navigationRoot, { backgroundColor: colors.canvas }]}>
        <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            animation: "none",
            contentStyle: { backgroundColor: colors.canvas },
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="decks/[deckId]"
            options={{ animation: "none", contentStyle: { backgroundColor: colors.canvas } }}
          />
        </Stack>
        <FlashcardToastHost />
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [prepared, setPrepared] = useState(false);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [preparationError, setPreparationError] = useState<Error | null>(null);
  const initializeAppDatabase = useCallback(async (database: SQLiteDatabase) => {
    await initializeDatabase(database);
    setDatabaseReady(true);
  }, []);

  useEffect(function prepareLocalStorage() {
    try {
      prepareAppStorage();
      setPrepared(true);
    } catch (error) {
      setPreparationError(toError(error, "Could not prepare app storage"));
    }
  }, []);

  if (preparationError) {
    throw preparationError;
  }
  if (!prepared) {
    return (
      <AppRecoveryProvider capability={appRecoveryCapability}>
        <StartupLoadingState />
      </AppRecoveryProvider>
    );
  }

  return (
    <AppRecoveryProvider capability={appRecoveryCapability}>
      <View style={styles.navigationRoot}>
        {!databaseReady && <StartupLoadingState />}
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          onError={handleSQLiteProviderError}
          onInit={initializeAppDatabase}
        >
          <DeckContentProvider>
            <LearningProgressResetProvider>
              <PreferencesProvider service={preferencesService}>
                <PreferencesThemeProvider>
                  <AppServicesProvider>
                    <AppNavigation />
                  </AppServicesProvider>
                </PreferencesThemeProvider>
              </PreferencesProvider>
            </LearningProgressResetProvider>
          </DeckContentProvider>
        </SQLiteProvider>
      </View>
    </AppRecoveryProvider>
  );
}

const styles = StyleSheet.create({
  fallbackScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  navigationRoot: { flex: 1 },
});
