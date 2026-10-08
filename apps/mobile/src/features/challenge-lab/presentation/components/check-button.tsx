import { StyleSheet, Text } from "react-native";

import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";

import { mixColors, shadeColor } from "@/features/challenge-lab/presentation/color-mix";
import { ChunkyButton } from "@/features/challenge-lab/presentation/components/chunky-button";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing } from "@/shared/presentation/typography";

type CheckButtonProps = Readonly<{
  /** Ready once the learner has given a full answer. */
  enabled: boolean;
  /** After checking, the button keeps its space but disappears, so nothing moves. */
  hidden: boolean;
  onPress: () => void;
  theme: DeckThemeVariant;
}>;

/** Submits a quiz that takes more than one tap to answer. */
export function CheckButton({ enabled, hidden, onPress, theme }: CheckButtonProps) {
  const ready = enabled && !hidden;

  return (
    <ChunkyButton
      accessibilityLabel="Check answer"
      accessibilityRole="button"
      disabled={!ready}
      faceStyle={styles.face}
      onPress={onPress}
      style={hidden && styles.hidden}
      tone={
        ready
          ? { edge: shadeColor(theme.accent, 0.3), face: theme.accent }
          : {
              edge: mixColors(theme.textSecondary, theme.background, 0.3),
              face: mixColors(theme.textSecondary, theme.background, 0.16),
            }
      }
    >
      <Text style={[styles.label, { color: ready ? theme.background : theme.textSecondary }]}>
        Check
      </Text>
    </ChunkyButton>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: "center", height: sizes.control.standard, justifyContent: "center" },
  label: {
    fontSize: fontSize.callout,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.widest,
    textTransform: "uppercase",
  },
  hidden: { opacity: 0 },
});
