import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeckSession } from "@/features/reels/context/deck-session-context";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

export function FeedModeSwitcher() {
  const { activeMode, selectMode } = useDeckSession();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.switcher}>
        <Pressable onPress={() => selectMode("for-you")} style={styles.mode}>
          <Text style={[styles.label, activeMode === "for-you" && styles.activeLabel]}>
            For You
          </Text>
          {activeMode === "for-you" && <View style={styles.indicator} />}
        </Pressable>
        <Pressable onPress={() => selectMode("session")} style={styles.mode}>
          <Text style={[styles.label, activeMode === "session" && styles.activeLabel]}>
            Session
          </Text>
          {activeMode === "session" && <View style={styles.indicator} />}
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
  mode: { alignItems: "center", flex: 1, justifyContent: "center" },
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
