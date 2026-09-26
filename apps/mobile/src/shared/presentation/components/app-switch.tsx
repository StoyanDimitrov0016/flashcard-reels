import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";

import { useAppTheme } from "@/shared/presentation/theme";

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 28;
const THUMB = 22;
const INSET = (TRACK_HEIGHT - THUMB) / 2;

type AppSwitchProps = Readonly<{
  accessibilityLabel: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}>;

/**
 * An on/off toggle in the app palette. The platform Switch on Android draws a Material ripple and
 * an accent color the app does not use elsewhere, so this one slides its thumb and nothing else.
 */
export function AppSwitch({ accessibilityLabel, onValueChange, value }: AppSwitchProps) {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(
    function slideThumb() {
      Animated.timing(progress, {
        duration: 160,
        easing: Easing.out(Easing.cubic),
        toValue: value ? 1 : 0,
        useNativeDriver: true,
      }).start();
    },
    [progress, value]
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        { backgroundColor: value ? colors.actionPrimary : colors.borderStrong },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: value ? colors.actionPrimaryText : colors.surfaceRaised,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, TRACK_WIDTH - THUMB - INSET * 2],
                }),
              },
            ],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: THUMB / 2, height: THUMB, width: THUMB },
  track: {
    borderRadius: TRACK_HEIGHT / 2,
    height: TRACK_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: INSET,
    width: TRACK_WIDTH,
  },
});
