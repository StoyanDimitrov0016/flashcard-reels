import { TopTabs } from "expo-router/js-top-tabs";
import { useRouter, type ErrorBoundaryProps } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeckAppearanceProvider } from "@/features/decks/presentation/context/deck-appearance-context";
import { FeedScopeProvider } from "@/features/reels/presentation/context/feed-scope-context";
import { ErrorState } from "@/shared/presentation/components/error-state";
import { useAppTheme } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";

type TabIconProps = Readonly<{ color: ColorValue; focused: boolean }>;

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const router = useRouter();

  return (
    <ErrorState
      message="Try again, or return to Discover."
      onPrimaryAction={retry}
      onSecondaryAction={() => router.replace("/(tabs)/(discover)")}
      primaryActionLabel="Try again"
      secondaryActionLabel="Back to Discover"
      title="This area could not load"
    />
  );
}

export default function TabLayout() {
  "use no memo";
  const { colors } = useAppTheme();
  const { bottom } = useSafeAreaInsets();

  return (
    <DeckAppearanceProvider>
      <FeedScopeProvider>
        <TopTabs
          tabBarPosition="bottom"
          screenOptions={{
            sceneStyle: { backgroundColor: colors.background },
            tabBarActiveTintColor: colors.actionPrimary,
            tabBarIndicatorStyle: { height: 0 },
            tabBarInactiveTintColor: colors.textMuted,
            tabBarPressColor: "transparent",
            tabBarPressOpacity: 1,
            tabBarShowIcon: true,
            tabBarShowLabel: false,
            tabBarStyle: {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              elevation: 0,
              paddingBottom: bottom,
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
                  name={{ android: "bar_chart", ios: "chart.bar.fill", web: "bar_chart" }}
                  size={sizes.icon.medium}
                  tintColor={color}
                />
              ),
              title: "Progress",
            }}
          />
          <TopTabs.Screen
            name="you"
            options={{
              tabBarIcon: ({ color }: TabIconProps) => (
                <SymbolView
                  name={{ android: "person", ios: "person.fill", web: "person" }}
                  size={sizes.icon.medium}
                  tintColor={color}
                />
              ),
              title: "You",
            }}
          />
        </TopTabs>
      </FeedScopeProvider>
    </DeckAppearanceProvider>
  );
}
