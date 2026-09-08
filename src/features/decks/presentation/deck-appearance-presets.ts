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

function luminance(hexColor: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255;
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

export function isCurrentPreset(
  preset: DeckAppearancePreset,
  appearance: Readonly<{ accentColor: string; backgroundColor: string }>
): boolean {
  return (
    preset.accentColor === appearance.accentColor &&
    preset.backgroundColor === appearance.backgroundColor
  );
}
