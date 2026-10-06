import { useState } from "react";
import { Animated, StyleSheet, View, useAnimatedValue } from "react-native";

import { useAppTheme } from "@/shared/presentation/theme";

/**
 * Tracks how far a lesson's ScrollView has been read. Spread `scrollViewProps` on an
 * `Animated.ScrollView` and pass the rest to `ReadingProgressBar`.
 */
export function useReadingProgress() {
  const scrollY = useAnimatedValue(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  return {
    scrollableHeight: Math.max(contentHeight - viewportHeight, 0),
    scrollViewProps: {
      onContentSizeChange: (_width: number, height: number) => setContentHeight(height),
      onLayout: (event: { nativeEvent: { layout: { height: number } } }) =>
        setViewportHeight(event.nativeEvent.layout.height),
      onScroll: Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
      scrollEventThrottle: 16,
    },
    scrollY,
  };
}

type ReadingProgressBarProps = Readonly<{
  color: string;
  /** Scroll offset, driven natively from the lesson's ScrollView. */
  scrollY: Animated.Value;
  /** How far the lesson can scroll; zero when it fits on screen. */
  scrollableHeight: number;
}>;

/** A thin bar under the header that fills in the deck's color as the lesson is read. */
export function ReadingProgressBar({ color, scrollY, scrollableHeight }: ReadingProgressBarProps) {
  const { colors } = useAppTheme();
  const progress =
    scrollableHeight > 0
      ? scrollY.interpolate({
          extrapolate: "clamp",
          inputRange: [0, scrollableHeight],
          outputRange: [0, 1],
        })
      : 1;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.track, { backgroundColor: colors.borderSubtle }]}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: color, transform: [{ scaleX: progress }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { height: "100%", transformOrigin: "left", width: "100%" },
  track: { height: 3, overflow: "hidden" },
});
