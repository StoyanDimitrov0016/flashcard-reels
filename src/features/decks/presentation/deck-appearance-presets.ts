import type { ResolvedColorScheme } from "@/features/preferences/domain/app-preferences";
import type { AppColors } from "@/shared/presentation/theme-colors";

export type DeckAppearancePreset = Readonly<{
  accentColor: string;
  backgroundColor: string;
  name: string;
}>;

export const deckAppearancePresets: readonly DeckAppearancePreset[] = [
  { accentColor: "#73D9FF", backgroundColor: "#0B151A", name: "Arctic blue" },
  { accentColor: "#F8C15C", backgroundColor: "#17130D", name: "Golden hour" },
  { accentColor: "#B8A5FF", backgroundColor: "#131020", name: "Ultraviolet" },
  { accentColor: "#82E0B0", backgroundColor: "#0D1815", name: "Mint forest" },
  { accentColor: "#FF9D66", backgroundColor: "#1A100D", name: "Solar orange" },
  { accentColor: "#FF8FA3", backgroundColor: "#1B0E13", name: "Rose night" },
  { accentColor: "#61DAFB", backgroundColor: "#0B1720", name: "Electric cyan" },
  { accentColor: "#D6F36A", backgroundColor: "#15190A", name: "Acid lime" },
  { accentColor: "#F0A7FF", backgroundColor: "#190D1B", name: "Orchid glow" },
] as const;

type RgbColor = readonly [red: number, green: number, blue: number];

function toHexChannel(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
}

function parseHexColor(hexColor: string): RgbColor | null {
  if (!/^#[\dA-Fa-f]{6}$/.test(hexColor)) {
    return null;
  }
  return [
    Number.parseInt(hexColor.slice(1, 3), 16),
    Number.parseInt(hexColor.slice(3, 5), 16),
    Number.parseInt(hexColor.slice(5, 7), 16),
  ];
}

function toHexColor([red, green, blue]: RgbColor): string {
  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`.toUpperCase();
}

function mixHexColors(first: string, second: string, secondWeight: number): string | null {
  const firstRgb = parseHexColor(first);
  const secondRgb = parseHexColor(second);
  if (!firstRgb || !secondRgb) {
    return null;
  }
  return toHexColor([
    firstRgb[0] + (secondRgb[0] - firstRgb[0]) * secondWeight,
    firstRgb[1] + (secondRgb[1] - firstRgb[1]) * secondWeight,
    firstRgb[2] + (secondRgb[2] - firstRgb[2]) * secondWeight,
  ]);
}

function luminance(hexColor: string): number {
  const rgb = parseHexColor(hexColor);
  if (!rgb) {
    return 0;
  }
  const channels = rgb.map((rawChannel) => {
    const channel = rawChannel / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const [red = 0, green = 0, blue = 0] = channels;
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  const light = Math.max(firstLuminance, secondLuminance);
  const dark = Math.min(firstLuminance, secondLuminance);
  return (light + 0.05) / (dark + 0.05);
}

function resolveReadableAccent(
  accentColor: string,
  backgroundColor: string,
  target: string
): string {
  if (parseHexColor(accentColor) && contrastRatio(accentColor, backgroundColor) >= 4.5) {
    return accentColor;
  }
  for (let step = 1; step <= 10; step += 1) {
    const candidate = mixHexColors(accentColor, target, step / 10);
    if (candidate && contrastRatio(candidate, backgroundColor) >= 4.5) {
      return candidate;
    }
  }
  return target;
}

export function resolveDeckAppearanceColors(
  appearance: Readonly<{ accentColor: string; backgroundColor: string }>,
  scheme: ResolvedColorScheme,
  colors: AppColors
): Readonly<{ accentColor: string; backgroundColor: string }> {
  if (scheme === "dark") {
    return {
      accentColor: appearance.accentColor,
      backgroundColor: appearance.backgroundColor,
    };
  }
  const backgroundColor =
    mixHexColors(colors.background, appearance.accentColor, 0.08) ?? colors.surfaceSubtle;
  return {
    accentColor: resolveReadableAccent(appearance.accentColor, backgroundColor, colors.textPrimary),
    backgroundColor,
  };
}

export function isCurrentPreset(
  preset: DeckAppearancePreset,
  appearance: Readonly<{ accentColor: string; backgroundColor: string }>
): boolean {
  return (
    preset.accentColor === appearance.accentColor &&
    preset.backgroundColor === appearance.backgroundColor
  );
}
