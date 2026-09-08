import { SQLiteProvider } from "expo-sqlite";
import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AppServicesProvider } from "@/infrastructure/app-services";
import { DATABASE_NAME, initializeDatabase } from "@/infrastructure/sqlite/database";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
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
    <View style={styles.stateScreen}>
      <Text style={styles.stateEyebrow}>Something went wrong</Text>
      <Text style={styles.stateTitle}>The next card could not load.</Text>
      <Text style={styles.errorMessage}>Your study data is safe. Try loading the app again.</Text>
      <Pressable onPress={retry} style={styles.retryButton}>
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
      <Pressable onPress={() => router.replace("/(tabs)/(discover)")} style={styles.homeButton}>
        <Text style={styles.homeLabel}>Back to Discover</Text>
      </Pressable>
    </View>
  );
}

export function SuspenseFallback() {
  return (
    <View style={styles.stateScreen}>
      <ActivityIndicator color={palette.textPrimary} size="large" />
      <Text style={styles.loadingLabel}>Shuffling your next cards…</Text>
    </View>
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
  stateScreen: {
    alignItems: "center",
    backgroundColor: palette.background,
    flex: 1,
    gap: sizes.spacing.section,
    justifyContent: "center",
    padding: sizes.spacing.spacious,
  },
  stateEyebrow: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  stateTitle: { color: palette.textPrimary, fontSize: 28, fontWeight: "700", textAlign: "center" },
  errorMessage: {
    color: palette.textTertiary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: palette.textPrimary,
    borderRadius: sizes.radius.pill,
    marginTop: sizes.spacing.medium,
    paddingHorizontal: sizes.spacing.content,
    paddingVertical: sizes.spacing.xLarge,
  },
  retryLabel: { color: palette.background, fontSize: 14, fontWeight: "800" },
  homeButton: {
    paddingHorizontal: sizes.spacing.section,
    paddingVertical: sizes.spacing.medium,
  },
  homeLabel: { color: palette.textLink, fontSize: 14, fontWeight: "700" },
  loadingLabel: { color: palette.textLoading, fontSize: 14 },
});
