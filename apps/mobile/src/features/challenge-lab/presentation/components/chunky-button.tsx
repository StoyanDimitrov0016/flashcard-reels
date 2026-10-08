import type { ReactNode } from "react";

import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useHaptics } from "@/features/preferences/presentation/controllers/use-haptics";

/** How far the face sits above its edge. Pressing pushes the face down onto it. */
const CHUNKY_EDGE = 4;
const CHUNKY_RADIUS = 16;

export type ChunkyTone = Readonly<{
  /** The outline and the raised edge below the face share one color. */
  edge: string;
  face: string;
}>;

type ChunkyButtonProps = Readonly<{
  accessibilityLabel: string;
  accessibilityRole: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  children: ReactNode;
  disabled?: boolean;
  /** Layout of the face's content, such as a row or a centered column. */
  faceStyle?: StyleProp<ViewStyle>;
  onPress: () => void;
  /** Sizing of the whole button within its parent, such as `flex: 1`. */
  style?: StyleProp<ViewStyle>;
  tone: ChunkyTone;
}>;

/**
 * A tactile, raised button: a face on a thicker bottom edge that sinks when pressed. The press
 * is a transform, so it never moves anything around the button.
 */
export function ChunkyButton({
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  children,
  disabled = false,
  faceStyle,
  onPress,
  style,
  tone,
}: ChunkyButtonProps) {
  const haptics = useHaptics();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.ratingSelected();
        onPress();
      }}
      style={[styles.base, { backgroundColor: tone.edge }, style]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            { backgroundColor: tone.face, borderColor: tone.edge },
            pressed && styles.facePressed,
            faceStyle,
          ]}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: CHUNKY_RADIUS },
  face: {
    borderRadius: CHUNKY_RADIUS,
    borderWidth: 2,
    marginBottom: CHUNKY_EDGE,
  },
  facePressed: { transform: [{ translateY: CHUNKY_EDGE - 1 }] },
});
