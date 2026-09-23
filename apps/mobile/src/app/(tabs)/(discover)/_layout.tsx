import { Stack } from "expo-router";

import { ViewErrorBoundary } from "@/shared/presentation/components/view-error-boundary";

export const unstable_settings = {
  initialRouteName: "index",
  screenErrorBoundary: ViewErrorBoundary,
};

export default function DiscoverLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
