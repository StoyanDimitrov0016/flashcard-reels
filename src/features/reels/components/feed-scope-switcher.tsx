import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFeedScope } from "@/features/reels/context/feed-scope-context";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

export function FeedScopeSwitcher() {
  const { activeScope, selectScope } = useFeedScope();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.switcher}>
        <Pressable onPress={() => selectScope("mixed")} style={styles.scope}>
          <Text style={[styles.label, activeScope === "mixed" && styles.activeLabel]}>Mixed</Text>
          {activeScope === "mixed" && <View style={styles.indicator} />}
        </Pressable>
        <Pressable onPress={() => selectScope("focused")} style={styles.scope}>
          <Text style={[styles.label, activeScope === "focused" && styles.activeLabel]}>
            Focused
          </Text>
          {activeScope === "focused" && <View style={styles.indicator} />}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: palette.background },
  switcher: {
    borderBottomColor: palette.border,
    borderBottomWidth: sizes.border,
    flexDirection: "row",
    height: 52,
  },
  scope: { alignItems: "center", flex: 1, justifyContent: "center" },
  label: { color: palette.textMuted, fontSize: 15, fontWeight: "700" },
  activeLabel: { color: palette.textPrimary },
  indicator: {
    backgroundColor: palette.accent,
    borderRadius: sizes.radius.small,
    bottom: 0,
    height: 4,
    position: "absolute",
    width: 70,
  },
});
