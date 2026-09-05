import { TopTabs } from "expo-router/js-top-tabs";
import { SymbolView } from "expo-symbols";
import type { ColorValue } from "react-native";

import { FeedScopeProvider } from "@/features/reels/context/feed-scope-context";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

type TabIconProps = Readonly<{ color: ColorValue; focused: boolean }>;

export default function TabLayout() {
  "use no memo";

  return (
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
          name="decks"
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
            title: "Decks",
          }}
        />
      </TopTabs>
    </FeedScopeProvider>
  );
}
