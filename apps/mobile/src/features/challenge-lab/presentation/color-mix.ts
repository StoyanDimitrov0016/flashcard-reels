/**
 * Blends `color` into `base` by `amount` (0 keeps `base`, 1 is `color`) and returns an opaque
 * `#RRGGBB`. Chunky buttons need opaque faces, because a translucent face shows its edge through.
 */
export function mixColors(color: string, base: string, amount: number): string {
  const from = toChannels(base);
  const to = toChannels(color);
  return `#${from
    .map((channel, index) => {
      const mixed = Math.round(channel + ((to[index] ?? channel) - channel) * amount);
      return mixed.toString(16).padStart(2, "0");
    })
    .join("")}`;
}

/** Darkens a color toward black, for the raised edge under a filled button. */
export function shadeColor(color: string, amount: number): string {
  return mixColors("#000000", color, amount);
}

function toChannels(hex: string): number[] {
  const value = hex.replace("#", "").slice(0, 6);
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}
