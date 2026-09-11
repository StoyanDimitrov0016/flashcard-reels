import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type EmptyFocusedFeedProps = Readonly<{ onChooseDeck: () => void }>;

export function EmptyFocusedFeed({ onChooseDeck }: EmptyFocusedFeedProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.screen}>
      <View style={styles.iconShell}>
        <SymbolView
          name={{ android: "book_2", ios: "rectangle.stack.fill", web: "book_2" }}
          size={sizes.icon.large}
          tintColor={colors.actionPrimary}
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      alignItems: "center",
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: "center",
      paddingBottom: 52,
      paddingHorizontal: 36,
    },
    iconShell: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: sizes.radius.panel,
      borderWidth: sizes.border,
      height: 76,
      justifyContent: "center",
      marginBottom: 22,
      width: 76,
    },
    title: {
      color: colors.textPrimary,
      fontSize: fontSize.heading2,
      fontWeight: fontWeight.heavy,
      textAlign: "center",
    },
    copy: {
      color: colors.textSecondary,
      fontSize: fontSize.bodyLarge,
      lineHeight: lineHeight.bodyLarge,
      marginTop: 10,
      maxWidth: 300,
      textAlign: "center",
    },
    button: {
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.pill,
      marginTop: 26,
      paddingHorizontal: 22,
      paddingVertical: 13,
    },
    buttonLabel: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.bodyLarge,
      fontWeight: fontWeight.heavy,
    },
  });
}
