import type { ColorValue } from "react-native";

import { type ErrorBoundaryProps as ExpoErrorBoundaryProps } from "expo-router";
import { TopTabs } from "expo-router/js-top-tabs";
import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeckAppearanceProvider } from "@/features/decks/presentation/context/deck-appearance-context";
import { FeedScopeProvider } from "@/features/reels/presentation/context/feed-scope-context";
import { reportError } from "@/shared/errors/report-error";
import { ViewErrorBoundary } from "@/shared/presentation/components/view-error-boundary";
import { ViewErrorState } from "@/shared/presentation/components/view-error-state";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";

type TabIconProps = Readonly<{ color: ColorValue; focused: boolean }>;

export const unstable_settings = { screenErrorBoundary: ViewErrorBoundary };

type ErrorBoundaryProps = Readonly<ExpoErrorBoundaryProps>;

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(
    function reportTabsFailure() {
      reportError(error, "Tabs section failure");
    },
    [error]
  );

  return <ViewErrorState allowAppRecovery error={error} retry={retry} scope="section" />;
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
            animationEnabled: false,
            sceneStyle: { backgroundColor: colors.canvas },
            tabBarActiveTintColor: colors.actionPrimary,
            tabBarAndroidRipple: {
              borderless: false,
              color: "transparent",
              radius: 0,
            },
            tabBarIndicatorStyle: { height: 0 },
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarPressColor: "transparent",
            tabBarPressOpacity: 1,
            tabBarShowIcon: true,
            tabBarShowLabel: false,
            tabBarStyle: {
              backgroundColor: colors.navigation,
              borderTopColor: colors.borderSubtle,
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
