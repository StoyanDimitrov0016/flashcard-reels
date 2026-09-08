import type { ErrorBoundaryProps } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import DeckDetailsScreen from "@/features/decks/presentation/screens/deck-details-screen";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>Could not load this deck</Text>
      <Text style={styles.errorCopy}>The cards are still safe. Try loading them again.</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default DeckDetailsScreen;

const styles = StyleSheet.create({
  errorCopy: { color: palette.textSecondary, textAlign: "center" },
  errorScreen: {
    alignItems: "center",
    backgroundColor: palette.background,
    flex: 1,
    gap: sizes.spacing.section,
    justifyContent: "center",
    padding: sizes.spacing.spacious,
  },
  errorTitle: { color: palette.textPrimary, fontSize: 24, fontWeight: "800" },
  retryButton: {
    backgroundColor: palette.textPrimary,
    borderRadius: sizes.radius.pill,
    paddingHorizontal: sizes.spacing.content,
    paddingVertical: sizes.spacing.xLarge,
  },
  retryLabel: { color: palette.ink, fontWeight: "800" },
});
