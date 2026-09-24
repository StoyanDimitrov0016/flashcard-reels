import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing } from "@/shared/presentation/typography";

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>404</Text>
      <Text style={styles.title}>This card wandered off.</Text>
      <Pressable onPress={() => router.replace("/(tabs)/(study)")} style={styles.button}>
        <Text style={styles.buttonLabel}>Return to For you</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      alignItems: "center",
      backgroundColor: colors.canvas,
      flex: 1,
      gap: sizes.spacing.section,
      justifyContent: "center",
      padding: sizes.spacing.spacious,
    },
    eyebrow: {
      color: colors.warning,
      fontSize: fontSize.footnote,
      fontWeight: fontWeight.heavy,
      letterSpacing: letterSpacing.eyebrow,
    },
    title: {
      color: colors.textPrimary,
      fontSize: fontSize.display,
      fontWeight: fontWeight.bold,
      textAlign: "center",
    },
    button: {
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.pill,
      marginTop: sizes.spacing.xLarge,
      paddingHorizontal: sizes.spacing.content,
      paddingVertical: sizes.spacing.xLarge,
    },
    buttonLabel: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.heavy,
    },
  });
}
