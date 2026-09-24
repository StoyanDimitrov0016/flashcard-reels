import { TopTabs, type MaterialTopTabBarProps } from "expo-router/js-top-tabs";

import {
  StudyFeedTabBar,
  type StudyFeedTab,
} from "@/features/reels/presentation/components/study-feed-tab-bar";
import { ViewErrorBoundary } from "@/shared/presentation/components/view-error-boundary";
import { useAppTheme } from "@/shared/presentation/theme";

export const unstable_settings = {
  initialRouteName: "index",
  screenErrorBoundary: ViewErrorBoundary,
};

const studyFeedTabs: readonly StudyFeedTab[] = [
  { accessibilityLabel: "For you feed", key: "index", label: "For you" },
  { accessibilityLabel: "Focus feed", key: "focus", label: "Focus" },
];

export default function StudyLayout() {
  "use no memo";
  const { colors } = useAppTheme();

  return (
    <TopTabs
      screenOptions={{
        animationEnabled: false,
        sceneStyle: { backgroundColor: colors.canvas },
        // Horizontal swipes belong to the bottom destinations; the feeds switch by tapping.
        swipeEnabled: false,
      }}
      tabBar={({ navigation, state }: MaterialTopTabBarProps) => (
        <StudyFeedTabBar
          activeKey={String(state.routes[state.index]?.name ?? "index")}
          onSelect={(name) => navigation.navigate(name)}
          tabs={studyFeedTabs}
        />
      )}
    >
      <TopTabs.Screen name="index" options={{ title: "For you" }} />
      <TopTabs.Screen name="focus" options={{ title: "Focus" }} />
    </TopTabs>
  );
}
