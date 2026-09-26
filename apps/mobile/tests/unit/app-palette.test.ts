import { darkColors, lightColors, type AppColors } from "@flashcard-reels/design-tokens";
import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/features/decks/presentation/deck-appearance-presets";

// WCAG AA: 4.5:1 for body text, 3:1 for secondary UI such as icons and muted metadata.
const bodyText = 4.5;
const nonTextUi = 3;

const RgbaPattern = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;

function channels(hex: string): number[] {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
}

// Translucent tokens are seen over the canvas, so compare the blended color.
function over(color: string, background: string): string {
  const match = RgbaPattern.exec(color);
  if (!match) {
    return color;
  }
  const alpha = Number(match[4]);
  const blended = channels(background).map((channel, index) =>
    Math.round(Number(match[index + 1]) * alpha + channel * (1 - alpha))
  );
  return `#${blended.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

describe.each([
  ["light", lightColors],
  ["dark", darkColors],
] as const)("%s app palette", (_scheme, colors: AppColors) => {
  const surfaces = [colors.canvas, colors.navigation, colors.surfaceRaised];

  it("keeps primary and secondary text readable on every surface", () => {
    for (const surface of surfaces) {
      expect(contrastRatio(colors.textPrimary, surface)).toBeGreaterThanOrEqual(bodyText);
      expect(contrastRatio(colors.textSecondary, surface)).toBeGreaterThanOrEqual(bodyText);
    }
  });

  it("keeps muted metadata and inactive icons distinguishable", () => {
    for (const surface of surfaces) {
      expect(contrastRatio(colors.textTertiary, surface)).toBeGreaterThanOrEqual(nonTextUi);
    }
  });

  it("keeps actions, errors, links, and inline code readable", () => {
    expect(contrastRatio(colors.actionPrimaryText, colors.actionPrimary)).toBeGreaterThanOrEqual(
      bodyText
    );
    expect(contrastRatio(colors.error, colors.canvas)).toBeGreaterThanOrEqual(bodyText);
    expect(contrastRatio(colors.interactive, colors.canvas)).toBeGreaterThanOrEqual(bodyText);
    expect(
      contrastRatio(colors.codeText, over(colors.codeSurface, colors.canvas))
    ).toBeGreaterThanOrEqual(bodyText);
  });
});
