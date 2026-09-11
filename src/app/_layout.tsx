import { SQLiteProvider } from "expo-sqlite";
import { Stack, ThemeProvider, type ErrorBoundaryProps, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PreferencesProvider } from "@/features/preferences/presentation/preferences-context";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { ErrorState } from "@/shared/presentation/components/error-state";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { getRouterTheme, useAppTheme } from "@/shared/presentation/theme";
import { AppServicesProvider } from "@/infrastructure/app-services";
import { preferencesService } from "@/infrastructure/preferences-services";
import { DATABASE_NAME, initializeDatabase } from "@/infrastructure/sqlite/database";
// oxlint-disable-next-line import/no-unassigned-import -- Expo Router loads this only on web.
import "../../global.css";

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const router = useRouter();

  return (
    <ErrorState
      eyebrow="Something went wrong"
      message="Your study data is safe. Try loading the app again."
      onPrimaryAction={retry}
      onSecondaryAction={() => router.replace("/(tabs)/(discover)")}
      primaryActionLabel="Try again"
      secondaryActionLabel="Back to Discover"
      title="The next card could not load."
    />
  );
}

export function SuspenseFallback() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.fallbackScreen, { backgroundColor: colors.background }]}>
      <LoadingState />
    </SafeAreaView>
  );
}

function AppNavigation() {
  const { colors, resolvedScheme } = useAppTheme();
  const { ready } = usePreferences();

  if (!ready) {
    return (
      <SafeAreaView style={[styles.fallbackScreen, { backgroundColor: colors.background }]}>
        <LoadingState label="Loading your preferences…" />
      </SafeAreaView>
    );
  }

  return (
    <ThemeProvider value={getRouterTheme(resolvedScheme, colors)}>
      <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          animation: "none",
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="decks/[deckId]"
          options={{ animation: "none", contentStyle: { backgroundColor: colors.background } }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
      <PreferencesProvider service={preferencesService}>
        <AppServicesProvider>
          <AppNavigation />
        </AppServicesProvider>
      </PreferencesProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  fallbackScreen: { flex: 1 },
});
