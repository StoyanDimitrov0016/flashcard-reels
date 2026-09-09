import { TopTabs } from "expo-router/js-top-tabs";
import { useRouter, type ErrorBoundaryProps } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ColorValue } from "react-native";

import { FeedScopeProvider } from "@/features/reels/presentation/context/feed-scope-context";
import { DeckAppearanceProvider } from "@/features/decks/presentation/context/deck-appearance-context";
import { ErrorState } from "@/shared/presentation/components/error-state";
import { palette } from "@/shared/presentation/palette";
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

  return (
    <DeckAppearanceProvider>
      <FeedScopeProvider>
        <TopTabs
          tabBarPosition="bottom"
          screenOptions={{
            sceneStyle: { backgroundColor: palette.background },
            tabBarActiveTintColor: palette.actionPrimary,
            tabBarIndicatorStyle: { height: 0 },
            tabBarInactiveTintColor: palette.textMuted,
            tabBarShowIcon: true,
            tabBarStyle: {
              backgroundColor: palette.background,
              borderTopColor: palette.border,
              elevation: 0,
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
