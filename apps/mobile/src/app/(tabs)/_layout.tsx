import { type ErrorBoundaryProps as ExpoErrorBoundaryProps } from "expo-router";
import { TopTabs } from "expo-router/js-top-tabs";
import { useEffect, useState } from "react";
import { StyleSheet, View, type Animated } from "react-native";

import { DeckAppearanceProvider } from "@/features/decks/presentation/context/deck-appearance-context";
import { StudyFeedHeader } from "@/features/reels/presentation/components/study-feed-header";
import { FeedScopeProvider } from "@/features/reels/presentation/context/feed-scope-context";
import { reportError } from "@/shared/errors/report-error";
import { AppTabBar, type AppTabItem } from "@/shared/presentation/components/app-tab-bar";
import { ViewErrorBoundary } from "@/shared/presentation/components/view-error-boundary";
import { ViewErrorState } from "@/shared/presentation/components/view-error-state";
import { useAppTheme } from "@/shared/presentation/theme";

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

// Swipe order follows the screen order below. For you and Focus share the Study item.
const forYouRoute = "(discover)";
const focusRoute = "focus";
const destinationRoutes = [forYouRoute, focusRoute, "reading", "library", "progress", "you"];

const tabItems: readonly AppTabItem[] = [
  {
    accessibilityLabel: "Study tab",
    icon: { android: "style", ios: "rectangle.stack.fill", web: "style" },
    key: "study",
    routeNames: [forYouRoute, focusRoute],
  },
  {
    accessibilityLabel: "Reading tab",
    icon: { android: "menu_book", ios: "book.fill", web: "menu_book" },
    key: "reading",
    routeNames: ["reading"],
  },
  {
    accessibilityLabel: "Library tab",
    icon: { android: "library_books", ios: "books.vertical.fill", web: "library_books" },
    key: "library",
    routeNames: ["library"],
  },
  {
    accessibilityLabel: "Progress tab",
    icon: { android: "bar_chart", ios: "chart.bar.fill", web: "bar_chart" },
    key: "progress",
    routeNames: ["progress"],
  },
  {
    accessibilityLabel: "You tab",
    icon: { android: "person", ios: "person.fill", web: "person" },
    key: "you",
    routeNames: ["you"],
  },
];

// Expo Router types these props loosely, so the layout names only the fields it reads.
type TabBarRenderProps = Readonly<{
  navigation: Readonly<{ navigate: (routeName: string) => void }>;
  position: Animated.AnimatedInterpolation<number>;
  state: Readonly<{ index: number; routes: readonly Readonly<{ name: string }>[] }>;
}>;

type PagerPositionReporterProps = Readonly<{
  position: Animated.AnimatedInterpolation<number>;
  onPosition: (position: Animated.AnimatedInterpolation<number>) => void;
}>;

function PagerPositionReporter({ position, onPosition }: PagerPositionReporterProps) {
  useEffect(
    function reportPagerPosition() {
      onPosition(position);
    },
    [onPosition, position]
  );

  return null;
}

export default function TabLayout() {
  "use no memo";
  const { colors } = useAppTheme();
  const [pagerPosition, setPagerPosition] = useState<Animated.AnimatedInterpolation<number> | null>(
    null
  );

  return (
    <DeckAppearanceProvider>
      <FeedScopeProvider>
        <View style={styles.root}>
          <TopTabs
            tabBar={({ navigation, position, state }: TabBarRenderProps) => (
              <>
                <PagerPositionReporter onPosition={setPagerPosition} position={position} />
                <AppTabBar
                  activeRouteName={state.routes[state.index]?.name ?? forYouRoute}
                  items={tabItems}
                  onSelect={(routeName) => navigation.navigate(routeName)}
                />
              </>
            )}
            tabBarPosition="bottom"
            screenOptions={{
              animationEnabled: false,
              sceneStyle: { backgroundColor: colors.canvas },
              swipeEnabled: true,
            }}
          >
            {destinationRoutes.map((name) => (
              <TopTabs.Screen key={name} name={name} />
            ))}
          </TopTabs>
          {pagerPosition && (
            <StudyFeedHeader
              focusIndex={destinationRoutes.indexOf(focusRoute)}
              forYouIndex={destinationRoutes.indexOf(forYouRoute)}
              position={pagerPosition}
            />
          )}
        </View>
      </FeedScopeProvider>
    </DeckAppearanceProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
