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
            name="(study)"
            options={{
              tabBarIcon: ({ color }: TabIconProps) => (
                <SymbolView
                  name={{ android: "style", ios: "rectangle.stack.fill", web: "style" }}
                  size={sizes.icon.medium}
                  tintColor={color}
                />
              ),
              title: "Study",
              tabBarAccessibilityLabel: "Study tab",
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
              tabBarAccessibilityLabel: "Library tab",
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
              tabBarAccessibilityLabel: "Progress tab",
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
              tabBarAccessibilityLabel: "You tab",
            }}
          />
        </TopTabs>
      </FeedScopeProvider>
    </DeckAppearanceProvider>
  );
}
