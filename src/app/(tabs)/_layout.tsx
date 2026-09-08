import { TopTabs } from "expo-router/js-top-tabs";
import { useRouter, type ErrorBoundaryProps } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View, type ColorValue } from "react-native";

import { FeedScopeProvider } from "@/features/reels/presentation/context/feed-scope-context";
import { DeckAppearanceProvider } from "@/features/decks/presentation/context/deck-appearance-context";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

type TabIconProps = Readonly<{ color: ColorValue; focused: boolean }>;

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const router = useRouter();
  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>This area could not load</Text>
      <Text style={styles.errorCopy}>Try again, or return to Discover.</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.primaryButton}>
        <Text style={styles.primaryLabel}>Try again</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/(tabs)/(discover)")}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryLabel}>Back to Discover</Text>
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  "use no memo";

  return (
    <DeckAppearanceProvider>
      <FeedScopeProvider>
        <TopTabs
          tabBarPosition="bottom"
          screenOptions={{
            sceneStyle: { backgroundColor: palette.background },
            tabBarActiveTintColor: palette.textPrimary,
            tabBarIndicatorStyle: { height: 0 },
            tabBarInactiveTintColor: palette.textMuted,
            tabBarShowIcon: true,
            tabBarStyle: {
              backgroundColor: palette.background,
              borderTopColor: palette.border,
            },
            swipeEnabled: true,
          }}
        >
          <TopTabs.Screen
            name="(discover)"
            options={{
              tabBarIcon: ({ color }: TabIconProps) => (
                <SymbolView
                  name={{ android: "explore", ios: "safari.fill", web: "explore" }}
                  size={sizes.icon.medium}
                  tintColor={color}
                />
              ),
              title: "Discover",
            }}
          />
          <TopTabs.Screen
            name="focus"
            options={{
              tabBarIcon: ({ color }: TabIconProps) => (
                <SymbolView
                  name={{
                    android: "center_focus_strong",
                    ios: "scope",
                    web: "center_focus_strong",
                  }}
                  size={sizes.icon.medium}
                  tintColor={color}
                />
              ),
              title: "Focus",
            }}
          />
          <TopTabs.Screen
            name="library"
            options={{
              tabBarIcon: ({ color }: TabIconProps) => (
                <SymbolView
                  name={{
                    android: "library_books",
                    ios: "books.vertical.fill",
                    web: "library_books",
                  }}
                  size={sizes.icon.medium}
                  tintColor={color}
                />
              ),
              title: "Library",
            }}
          />
          <TopTabs.Screen
            name="progress"
            options={{
              tabBarIcon: ({ color }: TabIconProps) => (
                <SymbolView
                  name={{
                    android: "insights",
                    ios: "chart.bar.xaxis",
                    web: "insights",
                  }}
                  size={sizes.icon.medium}
                  tintColor={color}
                />
              ),
              title: "Progress",
            }}
          />
        </TopTabs>
      </FeedScopeProvider>
    </DeckAppearanceProvider>
  );
}

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
  primaryButton: {
    backgroundColor: palette.textPrimary,
    borderRadius: sizes.radius.pill,
    paddingHorizontal: sizes.spacing.content,
    paddingVertical: sizes.spacing.xLarge,
  },
  primaryLabel: { color: palette.ink, fontWeight: "800" },
  secondaryButton: { padding: sizes.spacing.medium },
  secondaryLabel: { color: palette.textLink, fontWeight: "700" },
});
