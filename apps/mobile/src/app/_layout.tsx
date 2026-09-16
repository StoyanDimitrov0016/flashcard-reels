import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import { Stack, ThemeProvider, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PreferencesProvider } from "@/features/preferences/presentation/preferences-context";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { DeckContentProvider } from "@/features/decks/presentation/context/deck-content-context";
import { LearningProgressResetProvider } from "@/features/learner-profile/presentation/context/learning-progress-reset-context";
import { FlashcardToastHost } from "@/shared/presentation/flashcard-toast";
import { ErrorState } from "@/shared/presentation/components/error-state";
import { AppResetAction } from "@/shared/presentation/components/app-reset-action";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { getRouterTheme, useAppTheme } from "@/shared/presentation/theme";
import { AppServicesProvider } from "@/infrastructure/app-services";
import { preferencesService } from "@/infrastructure/preferences-services";
import { DATABASE_NAME, initializeDatabase } from "@/infrastructure/sqlite/database";
import { prepareAppStorage } from "@/infrastructure/app-recovery";
import { getAppColors } from "@/shared/presentation/theme-colors";
// oxlint-disable-next-line import/no-unassigned-import -- Expo Router loads this only on web.
import "../../global.css";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ErrorState
      error={error}
      onPrimaryAction={retry}
      primaryActionLabel="Try again"
      title="Couldn’t start the app"
    />
  );
}

export function SuspenseFallback() {
  const colors = getAppColors(useColorScheme() === "dark" ? "dark" : "light");

  return (
    <SafeAreaView style={[styles.fallbackScreen, { backgroundColor: colors.canvas }]}>
      <ActivityIndicator color={colors.textPrimary} size="large" />
      <Text style={{ color: colors.textPrimary }}>Starting the app…</Text>
      <AppResetAction />
    </SafeAreaView>
  );
}

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
    return (
      <SafeAreaView style={[styles.fallbackScreen, { backgroundColor: colors.canvas }]}>
        <LoadingState label="Loading your preferences…" />
      </SafeAreaView>
    );
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
      // oxlint-disable-next-line react/set-state-in-effect -- Gate database mounting on external storage recovery after commit.
      setPrepared(true);
    } catch (error) {
      setPreparationError(error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  if (preparationError) {
    throw preparationError;
  }
  if (!prepared) {
    return <SuspenseFallback />;
  }

  return (
    <View style={styles.navigationRoot}>
      {!databaseReady ? <SuspenseFallback /> : null}
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeAppDatabase}>
        <DeckContentProvider>
          <LearningProgressResetProvider>
            <PreferencesProvider service={preferencesService}>
              <AppServicesProvider>
                <AppNavigation />
              </AppServicesProvider>
            </PreferencesProvider>
          </LearningProgressResetProvider>
        </DeckContentProvider>
      </SQLiteProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  navigationRoot: { flex: 1 },
});
