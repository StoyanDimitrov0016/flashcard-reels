import { useState } from "react";
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing } from "@/shared/presentation/typography";

const studyFeedHeaderHeight = 44;

/** Top space the study feeds leave for the status bar and this header over full-bleed cards. */
export function useStudyFeedContentInset(): number {
  return useSafeAreaInsets().top + studyFeedHeaderHeight;
}

const indicatorWidth = 18;
const indicatorHeight = 2;
// The header is gone once the pager is this far past Focus toward the next destination.
const fadeOutDistance = 0.6;

type LabelLayout = Readonly<{ x: number; width: number }>;

type StudyFeedHeaderProps = Readonly<{
  /** The pager position, where each destination is one whole step. */
  position: Animated.AnimatedInterpolation<number>;
  forYouIndex: number;
  focusIndex: number;
}>;

/**
 * A fixed, non-interactive header over the two study feeds. It follows the horizontal pager, so
 * the underline slides between For you and Focus while swiping and the header fades out as the
 * learner swipes on to the next destination.
 */
export function StudyFeedHeader({ position, forYouIndex, focusIndex }: StudyFeedHeaderProps) {
  const { colors } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const styles = createStyles(colors);
  const [forYouLayout, setForYouLayout] = useState<LabelLayout | null>(null);
  const [focusLayout, setFocusLayout] = useState<LabelLayout | null>(null);

  const feedRange = [forYouIndex, focusIndex];
  const headerOpacity = position.interpolate({
    extrapolate: "clamp",
    inputRange: [
      forYouIndex - fadeOutDistance,
      forYouIndex,
      focusIndex,
      focusIndex + fadeOutDistance,
    ],
    outputRange: [0, 1, 1, 0],
  });
  const forYouEmphasis = position.interpolate({
    extrapolate: "clamp",
    inputRange: feedRange,
    outputRange: [1, 0],
  });
  const focusEmphasis = position.interpolate({
    extrapolate: "clamp",
    inputRange: feedRange,
    outputRange: [0, 1],
  });
  const indicatorOffset =
    forYouLayout && focusLayout
      ? position.interpolate({
          extrapolate: "clamp",
          inputRange: feedRange,
          outputRange: [centeredIndicatorX(forYouLayout), centeredIndicatorX(focusLayout)],
        })
      : null;

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.header,
        { height: top + studyFeedHeaderHeight, opacity: headerOpacity, paddingTop: top },
      ]}
    >
      <View style={styles.labels}>
        <FeedLabel
          colors={colors}
          emphasis={forYouEmphasis}
          label="For you"
          onLayout={(event) => setForYouLayout(toLabelLayout(event))}
        />
        <FeedLabel
          colors={colors}
          emphasis={focusEmphasis}
          label="Focus"
          onLayout={(event) => setFocusLayout(toLabelLayout(event))}
        />
        {indicatorOffset && (
          <Animated.View
            style={[styles.indicator, { transform: [{ translateX: indicatorOffset }] }]}
          />
        )}
      </View>
    </Animated.View>
  );
}

type FeedLabelProps = Readonly<{
  colors: AppColors;
  emphasis: Animated.AnimatedInterpolation<number>;
  label: string;
  onLayout: (event: LayoutChangeEvent) => void;
}>;

// Color cannot animate on the native driver, so an emphasized copy fades over the muted label.
function FeedLabel({ colors, emphasis, label, onLayout }: FeedLabelProps) {
  const styles = createStyles(colors);

  return (
    <View onLayout={onLayout}>
      <Text style={[styles.label, styles.mutedLabel]}>{label}</Text>
      <Animated.Text style={[styles.label, styles.emphasizedLabel, { opacity: emphasis }]}>
        {label}
      </Animated.Text>
    </View>
  );
}

function toLabelLayout(event: LayoutChangeEvent): LabelLayout {
  return { width: event.nativeEvent.layout.width, x: event.nativeEvent.layout.x };
}

function centeredIndicatorX(layout: LabelLayout): number {
  return layout.x + (layout.width - indicatorWidth) / 2;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    emphasizedLabel: { color: colors.textPrimary, position: "absolute" },
    header: {
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    indicator: {
      backgroundColor: colors.textPrimary,
      borderRadius: sizes.radius.small,
      bottom: sizes.spacing.xSmall,
      height: indicatorHeight,
      left: 0,
      position: "absolute",
      width: indicatorWidth,
    },
    label: {
      fontSize: fontSize.callout,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.wide,
    },
    labels: {
      alignItems: "center",
      alignSelf: "center",
      flexDirection: "row",
      gap: sizes.spacing.wide,
      height: studyFeedHeaderHeight,
    },
    mutedLabel: { color: colors.textTertiary },
  });
}
