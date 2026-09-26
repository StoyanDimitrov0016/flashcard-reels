import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { AppResetAction } from "@/shared/presentation/components/app-reset-action";
import { revealApp } from "@/shared/presentation/native-splash";
import { sizes } from "@/shared/presentation/sizes";
import { getAppColors } from "@/shared/presentation/theme-colors";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

// Normal startup finishes well before this, behind the native splash.
const STUCK_AFTER_MS = 8000;

/**
 * Sits behind the native splash while the app prepares. Only if preparation stalls does it reveal
 * a spinner and a quiet way out, so a stuck database can still be reset.
 */
export function StartupLoadingState() {
  const colors = getAppColors(useColorScheme() === "dark" ? "dark" : "light");
  const [stuck, setStuck] = useState(false);

  useEffect(function revealWhenStuck() {
    const timer = setTimeout(() => {
      revealApp();
      setStuck(true);
    }, STUCK_AFTER_MS);
    return function cancelStuckReveal() {
      clearTimeout(timer);
    };
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      {stuck && (
        <View style={styles.content}>
          <ActivityIndicator color={colors.textSecondary} size="large" />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Still starting…</Text>
          <AppResetAction
            renderTrigger={(open) => (
              <Pressable accessibilityRole="button" hitSlop={8} onPress={open}>
                <Text style={[styles.link, { color: colors.textTertiary }]}>
                  Having trouble? Reset app data
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: "center", flex: 1, gap: sizes.spacing.section, justifyContent: "center" },
  label: { fontSize: fontSize.body },
  link: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    marginTop: sizes.spacing.xLarge,
  },
  // Covers the app while the database opens underneath it.
  screen: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 1 },
});
