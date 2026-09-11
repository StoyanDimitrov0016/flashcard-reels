import type { ResolvedColorScheme } from "@/features/preferences/domain/app-preferences";
import { type DeckAppearancePresetId } from "@/features/decks/domain/deck-appearance.model";

export type DeckAppearanceVariant = Readonly<{
  background: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
}>;

export type DeckAppearancePreset = Readonly<{
  id: DeckAppearancePresetId;
  name: string;
  light: DeckAppearanceVariant;
  dark: DeckAppearanceVariant;
}>;

export const deckAppearancePresets: readonly DeckAppearancePreset[] = [
  {
    id: "graphite",
    name: "Graphite",
    light: {
      background: "#F8FAFC",
      accent: "#334155",
      textPrimary: "#0F172A",
      textSecondary: "#475569",
    },
    dark: {
      background: "#020617",
      accent: "#94A3B8",
      textPrimary: "#F1F5F9",
      textSecondary: "#94A3B8",
    },
  },
  {
    id: "gold",
    name: "Gold",
    light: {
      background: "#FFFBEB",
      accent: "#B45309",
      textPrimary: "#78350F",
      textSecondary: "#B45309",
    },
    dark: {
      background: "#451A03",
      accent: "#FBBF24",
      textPrimary: "#FEF3C7",
      textSecondary: "#FBBF24",
    },
  },
  {
    id: "orange",
    name: "Orange",
    light: {
      background: "#FFF7ED",
      accent: "#C2410C",
      textPrimary: "#7C2D12",
      textSecondary: "#C2410C",
    },
    dark: {
      background: "#431407",
      accent: "#FB923C",
      textPrimary: "#FFEDD5",
      textSecondary: "#FB923C",
    },
  },
  {
    id: "rose",
    name: "Rose",
    light: {
      background: "#FFF1F2",
      accent: "#BE123C",
      textPrimary: "#881337",
      textSecondary: "#BE123C",
    },
    dark: {
      background: "#4C0519",
      accent: "#FB7185",
      textPrimary: "#FFE4E6",
      textSecondary: "#FB7185",
    },
  },
  {
    id: "violet",
    name: "Violet",
    light: {
      background: "#F5F3FF",
      accent: "#6D28D9",
      textPrimary: "#4C1D95",
      textSecondary: "#6D28D9",
    },
    dark: {
      background: "#2E1065",
      accent: "#A78BFA",
      textPrimary: "#EDE9FE",
      textSecondary: "#A78BFA",
    },
  },
  {
    id: "blue",
    name: "Blue",
    light: {
      background: "#EFF6FF",
      accent: "#1D4ED8",
      textPrimary: "#1E3A8A",
      textSecondary: "#1D4ED8",
    },
    dark: {
      background: "#172554",
      accent: "#60A5FA",
      textPrimary: "#DBEAFE",
      textSecondary: "#60A5FA",
    },
  },
  {
    id: "cyan",
    name: "Cyan",
    light: {
      background: "#ECFEFF",
      accent: "#0E7490",
      textPrimary: "#164E63",
      textSecondary: "#0E7490",
    },
    dark: {
      background: "#083344",
      accent: "#22D3EE",
      textPrimary: "#CFFAFE",
      textSecondary: "#22D3EE",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    light: {
      background: "#ECFDF5",
      accent: "#047857",
      textPrimary: "#064E3B",
      textSecondary: "#047857",
    },
    dark: {
      background: "#022C22",
      accent: "#34D399",
      textPrimary: "#D1FAE5",
      textSecondary: "#34D399",
    },
  },
  {
    id: "lime",
    name: "Lime",
    light: {
      background: "#F7FEE7",
      accent: "#4D7C0F",
      textPrimary: "#365314",
      textSecondary: "#4D7C0F",
    },
    dark: {
      background: "#1A2E05",
      accent: "#A3E635",
      textPrimary: "#ECFCCB",
      textSecondary: "#A3E635",
    },
  },
  {
    id: "stone",
    name: "Stone",
    light: {
      background: "#FAFAF9",
      accent: "#44403C",
      textPrimary: "#1C1917",
      textSecondary: "#57534E",
    },
    dark: {
      background: "#0C0A09",
      accent: "#A8A29E",
      textPrimary: "#F5F5F4",
      textSecondary: "#A8A29E",
    },
  },
] as const;

const presetsById: ReadonlyMap<DeckAppearancePresetId, DeckAppearancePreset> = new Map(
  deckAppearancePresets.map((preset) => [preset.id, preset])
);

export function resolveDeckAppearance(
  presetId: DeckAppearancePresetId,
  scheme: ResolvedColorScheme
): DeckAppearanceVariant {
  const preset = presetsById.get(presetId);
  if (!preset) {
    throw new Error(`Unknown deck appearance preset ${presetId}`);
  }
  return scheme === "light" ? preset.light : preset.dark;
}

export function isCurrentPreset(
  preset: DeckAppearancePreset,
  appearance: Readonly<{ presetId: DeckAppearancePresetId }>
): boolean {
  return preset.id === appearance.presetId;
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function luminance(color: string): number {
  const channels = color
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) {
    return 0;
  }
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}
