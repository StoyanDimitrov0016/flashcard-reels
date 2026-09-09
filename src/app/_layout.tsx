import { SQLiteProvider } from "expo-sqlite";
import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppServicesProvider } from "@/infrastructure/app-services";
import { DATABASE_NAME, initializeDatabase } from "@/infrastructure/sqlite/database";
import { ErrorState } from "@/shared/presentation/components/error-state";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { palette } from "@/shared/presentation/palette";
// oxlint-disable-next-line import/no-unassigned-import -- Expo Router loads this only on web.
import "../../global.css";

const appTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.background,
    border: palette.border,
    card: palette.background,
  },
};

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
  return (
    <SafeAreaView style={styles.fallbackScreen}>
      <LoadingState label="Shuffling your next cards…" />
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
      <AppServicesProvider>
        <ThemeProvider value={appTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              animation: "fade",
              contentStyle: styles.appBackground,
              headerShown: false,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="decks/[deckId]"
              options={{ animation: "none", contentStyle: styles.appBackground }}
            />
          </Stack>
        </ThemeProvider>
      </AppServicesProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  appBackground: { backgroundColor: palette.background },
  fallbackScreen: { backgroundColor: palette.background, flex: 1 },
});
