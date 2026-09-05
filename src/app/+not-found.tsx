import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

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
  eyebrow: { color: palette.warning, fontSize: 13, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: palette.textPrimary, fontSize: 30, fontWeight: "700", textAlign: "center" },
  button: {
    backgroundColor: palette.textPrimary,
    borderRadius: sizes.radius.pill,
    marginTop: sizes.spacing.xLarge,
    paddingHorizontal: sizes.spacing.content,
    paddingVertical: sizes.spacing.xLarge,
  },
  buttonLabel: { color: palette.background, fontSize: 14, fontWeight: "800" },
});
