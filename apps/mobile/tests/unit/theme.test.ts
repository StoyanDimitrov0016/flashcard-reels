import { describe, expect, it } from "vitest";

import { sizes } from "@/shared/presentation/sizes";
import { darkColors, getAppColors, lightColors } from "@/shared/presentation/theme-colors";
import { fontSize, lineHeight } from "@/shared/presentation/typography";

describe("semantic application themes", () => {
  it("keeps the specified light and dark semantic palettes", () => {
    expect(lightColors).toMatchObject({
      canvas: "#FFFFFF",
      navigation: "#F7F7F5",
      surfaceRaised: "#FFFFFF",
      surfaceSubtle: "#F1F1EF",
      surfaceHover: "#EFEFED",
      textPrimary: "#373530",
      textSecondary: "#787774",
      textTertiary: "#9B9A97",
      borderSubtle: "rgba(55,53,47,0.12)",
      borderStrong: "rgba(55,53,47,0.22)",
      interactive: "#2383E2",
      interactiveHover: "#0B6BCB",
      success: "#2E7D32",
      warning: "#C58A16",
      error: "#D44C47",
      overlay: "rgba(15,15,15,0.35)",
      actionPrimary: "#373530",
      actionPrimaryText: "#FFFFFF",
      studyIslandSurface: "#FFFFFF",
      studyIslandBorder: "rgba(55,53,47,0.22)",
    });
    expect(darkColors).toMatchObject({
      canvas: "#191919",
      navigation: "#202020",
      surfaceRaised: "#252525",
      surfaceSubtle: "#2A2A2A",
      surfaceHover: "#2F2F2F",
      textPrimary: "#D4D4D4",
      textSecondary: "#9B9B9B",
      textTertiary: "#737373",
      borderSubtle: "rgba(255,255,255,0.08)",
      borderStrong: "rgba(255,255,255,0.16)",
      interactive: "#2383E2",
      interactiveHover: "#4A9EF0",
      success: "#4F9768",
      warning: "#C19138",
      error: "#BE524B",
      overlay: "rgba(0,0,0,0.55)",
      actionPrimary: "#D4D4D4",
      actionPrimaryText: "#191919",
      studyIslandSurface: "#252525",
      studyIslandBorder: "rgba(255,255,255,0.16)",
    });
  });

  it("resolves app colors from the same scheme", () => {
    expect(getAppColors("light")).toBe(lightColors);
    expect(getAppColors("dark")).toBe(darkColors);
  });

  it("keeps answer typography dedicated to the flashcard answer surface", () => {
    expect(fontSize.flashcardAnswer).toBe(25);
    expect(lineHeight.flashcardAnswer).toBe(33);
  });

  it("keeps shared control and study layout metrics named", () => {
    expect(sizes.touchTarget.minimum).toBe(44);
    expect(sizes.control).toMatchObject({ compact: 36, standard: 48, audio: 48 });
    expect(sizes.study).toMatchObject({
      answerMaxWidth: 480,
      horizontalIsland: { maxWidth: 360, width: "80%" },
      recallIcon: 40,
      sideControlRegion: 84,
      sideEdgeOffset: 14,
    });
    expect(sizes.sheet).toEqual({ maxWidthCompact: 560, maxWidthWide: 680 });
    expect(sizes.input.standard).toBe(48);
  });
});
