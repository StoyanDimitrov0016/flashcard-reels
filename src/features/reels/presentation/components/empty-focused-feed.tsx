import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type EmptyFocusedFeedProps = Readonly<{ onChooseDeck: () => void }>;

export function EmptyFocusedFeed({ onChooseDeck }: EmptyFocusedFeedProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.iconShell}>
        <SymbolView
          name={{ android: "book_2", ios: "rectangle.stack.fill", web: "book_2" }}
          size={sizes.icon.large}
          tintColor={palette.actionPrimary}
        />
      </View>
      <Text style={styles.title}>Build a focused feed</Text>
      <Text style={styles.copy}>Choose a deck, then work through only its flashcards.</Text>
      <Pressable accessibilityRole="button" onPress={onChooseDeck} style={styles.button}>
        <Text style={styles.buttonLabel}>Choose a deck</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: palette.background,
    flex: 1,
    justifyContent: "center",
    paddingBottom: 52,
    paddingHorizontal: 36,
  },
  iconShell: {
    alignItems: "center",
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.borderStrong,
    borderRadius: sizes.radius.panel,
    borderWidth: sizes.border,
    height: 76,
    justifyContent: "center",
    marginBottom: 22,
    width: 76,
  },
  title: {
    color: palette.textPrimary,
    fontSize: fontSize.heading2,
    fontWeight: fontWeight.heavy,
    textAlign: "center",
  },
  copy: {
    color: palette.textSecondary,
    fontSize: fontSize.bodyLarge,
    lineHeight: lineHeight.bodyLarge,
    marginTop: 10,
    maxWidth: 300,
    textAlign: "center",
  },
  button: {
    backgroundColor: palette.textPrimary,
    borderRadius: sizes.radius.pill,
    marginTop: 26,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  buttonLabel: {
    color: palette.background,
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.heavy,
  },
});
