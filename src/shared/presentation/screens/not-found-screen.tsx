import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing } from "@/shared/presentation/typography";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>404</Text>
      <Text style={styles.title}>This card wandered off.</Text>
      <Pressable onPress={() => router.replace("/(tabs)/(discover)")} style={styles.button}>
        <Text style={styles.buttonLabel}>Return to Discover</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: palette.background,
    flex: 1,
    gap: sizes.spacing.section,
    justifyContent: "center",
    padding: sizes.spacing.spacious,
  },
  eyebrow: {
    color: palette.warning,
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.eyebrow,
  },
  title: {
    color: palette.textPrimary,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  button: {
    backgroundColor: palette.textPrimary,
    borderRadius: sizes.radius.pill,
    marginTop: sizes.spacing.xLarge,
    paddingHorizontal: sizes.spacing.content,
    paddingVertical: sizes.spacing.xLarge,
  },
  buttonLabel: { color: palette.background, fontSize: fontSize.body, fontWeight: fontWeight.heavy },
});
