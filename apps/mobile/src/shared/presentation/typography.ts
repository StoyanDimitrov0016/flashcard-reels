export const fontWeight = {
  regular: "400",
  semibold: "600",
  bold: "700",
  heavy: "800",
} as const;

export const fontSize = {
  micro: 9,
  caption: 12,
  footnote: 13,
  body: 14,
  bodyLarge: 15,
  callout: 16,
  subhead: 17,
  title3: 18,
  title2: 20,
  deckTitle: 21,
  title1: 24,
  heading2: 25,
  heading1: 27,
  flashcardAnswer: 25,
  heading0: 28,
  display: 30,
  hero: 40,
} as const;

export const letterSpacing = {
  tightest: -1.4,
  tight: -0.5,
  none: 0,
  wide: 0.3,
  wider: 0.5,
  widest: 1.2,
  eyebrow: 1.4,
} as const;

export const lineHeight = {
  hero: 45,
  heading1: 36,
  flashcardAnswer: 33,
  title3: 26,
  subhead: 24,
  body: 20,
  bodyLarge: 22,
  footnote: 18,
  caption: 19,
} as const;

export const textStyles = {
  screenTitle: {
    fontSize: fontSize.title1,
    fontWeight: fontWeight.heavy,
  },
  primaryButtonLabel: {
    fontWeight: fontWeight.heavy,
  },
} as const;
