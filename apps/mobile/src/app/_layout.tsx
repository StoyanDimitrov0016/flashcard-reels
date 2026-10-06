import { QueryClientProvider } from "@tanstack/react-query";
import { NavigationBar } from "expo-navigation-bar";
import {
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps as ExpoErrorBoundaryProps,
} from "expo-router";
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { DeckContentProvider } from "@/features/decks/presentation/context/deck-content-context";
import { DeckThemeSelectionProvider } from "@/features/decks/presentation/context/deck-theme-selection-context";
import { LearningProgressRevisionProvider } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import {
  PreferencesProvider,
  usePreferencesContext,
} from "@/features/preferences/presentation/controllers/preferences-context";
import { PreferencesThemeProvider } from "@/features/preferences/presentation/preferences-theme-provider";
import { FeedScopeProvider } from "@/features/reels/presentation/context/feed-scope-context";
import { prepareAppStorage, requestAppDataReset } from "@/infrastructure/app-recovery";
import { AppServicesProvider, useAppServices } from "@/infrastructure/app-services";
import {
  DATABASE_NAME,
  handleSQLiteProviderError,
  initializeDatabase,
} from "@/infrastructure/sqlite/database";
import { toError } from "@/shared/errors/normalize-error";
import { GlobalErrorState } from "@/shared/presentation/components/global-error-state";
import { StartupLoadingState } from "@/shared/presentation/components/startup-loading-state";
import { ViewErrorBoundary } from "@/shared/presentation/components/view-error-boundary";
import { AppRecoveryProvider } from "@/shared/presentation/context/app-recovery-context";
import { FlashcardToastHost } from "@/shared/presentation/flashcard-toast";
// Must run before the first render, so it is imported for its side effect here.
import { revealApp } from "@/shared/presentation/native-splash";
import { createQueryClient } from "@/shared/presentation/query-client";
import { AppThemeProvider, getRouterTheme, useAppTheme } from "@/shared/presentation/theme";

import "../../global.css";

const appRecoveryCapability = { requestAppDataReset };

type ErrorBoundaryProps = Readonly<ExpoErrorBoundaryProps>;

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const resolvedScheme = useColorScheme() === "dark" ? "dark" : "light";
  useEffect(function revealErrorState() {
    revealApp();
  }, []);

  return (
    <AppRecoveryProvider capability={appRecoveryCapability}>
      <AppThemeProvider resolvedScheme={resolvedScheme}>
        <GlobalErrorState error={error} retry={retry} />
      </AppThemeProvider>
    </AppRecoveryProvider>
  );
}

export function SuspenseFallback() {
  return <StartupLoadingState />;
}

export const unstable_settings = { screenErrorBoundary: ViewErrorBoundary };

function TransparentNavigationBar() {
  const { resolvedScheme } = useAppTheme();

  if (Platform.OS !== "android") {
    return null;
  }

  return <NavigationBar hidden={false} style={resolvedScheme === "dark" ? "light" : "dark"} />;
}

function AppNavigation() {
  const { colors, resolvedScheme } = useAppTheme();
  const { ready } = usePreferencesContext();

  useEffect(
    function synchronizeNativeRootBackground() {
      void SystemUI.setBackgroundColorAsync(colors.canvas).catch(() => undefined);
    },
    [colors.canvas]
  );

  useEffect(
    function revealWhenReady() {
      if (ready) {
        revealApp();
      }
    },
    [ready]
  );

  if (!ready) {
    return <StartupLoadingState />;
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
          <Stack.Screen name="archived-progress" />
          <Stack.Screen name="progress-backup" />
          <Stack.Screen
            name="decks/[deckId]"
            options={{ animation: "none", contentStyle: { backgroundColor: colors.canvas } }}
          />
          <Stack.Screen
            name="reading/[deckId]"
            options={{ animation: "none", contentStyle: { backgroundColor: colors.canvas } }}
          />
          <Stack.Screen
            name="lessons/[lessonId]"
            options={{ animation: "none", contentStyle: { backgroundColor: colors.canvas } }}
          />
        </Stack>
        <FlashcardToastHost />
      </View>
    </ThemeProvider>
  );
}

function AppPreferences() {
  const { preferencesService } = useAppServices();

  return (
    <PreferencesProvider service={preferencesService}>
      <PreferencesThemeProvider>
        <FeedScopeProvider>
          <AppNavigation />
        </FeedScopeProvider>
      </PreferencesThemeProvider>
    </PreferencesProvider>
  );
}

/** Synchronous and idempotent, so it runs once while the root first renders. */
function prepareLocalStorage(): Error | null {
  try {
    prepareAppStorage();
    return null;
  } catch (error) {
    return toError(error, "Could not prepare app storage");
  }
}

function RootLayoutContent() {
  const [preparationError] = useState(prepareLocalStorage);
  const [queryClient] = useState(createQueryClient);
  const [databaseReady, setDatabaseReady] = useState(false);
  const initializeAppDatabase = useCallback(async (database: SQLiteDatabase) => {
    await initializeDatabase(database);
    setDatabaseReady(true);
  }, []);

  if (preparationError) {
    throw preparationError;
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
          <QueryClientProvider client={queryClient}>
            <DeckContentProvider>
              <DeckThemeSelectionProvider>
                <LearningProgressRevisionProvider>
                  <AppServicesProvider>
                    <AppPreferences />
                  </AppServicesProvider>
                </LearningProgressRevisionProvider>
              </DeckThemeSelectionProvider>
            </DeckContentProvider>
          </QueryClientProvider>
        </SQLiteProvider>
      </View>
    </AppRecoveryProvider>
  );
}

export default function RootLayout() {
  const resolvedScheme = useColorScheme() === "dark" ? "dark" : "light";

  return (
    <AppThemeProvider resolvedScheme={resolvedScheme}>
      <TransparentNavigationBar />
      <RootLayoutContent />
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  navigationRoot: { flex: 1 },
});
