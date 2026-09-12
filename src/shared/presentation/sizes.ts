export const sizes = {
  border: 1,
  icon: {
    small: 18,
    medium: 22,
    large: 34,
  },
  touchTarget: {
    minimum: 44,
  },
  control: {
    compact: 36,
    standard: 48,
    audio: 48,
  },
  study: {
    recallIcon: 40,
    sideControlRegion: 84,
    sideEdgeOffset: 14,
    answerMaxWidth: 480,
    horizontalIsland: {
      maxWidth: 360,
      width: "80%",
    },
  },
  sheet: {
    maxWidthCompact: 560,
    maxWidthWide: 680,
  },
  input: {
    standard: 48,
  },
  radius: {
    small: 2,
    medium: 4,
    control: 19,
    row: 14,
    card: 22,
    panel: 24,
    island: 28,
    pill: 999,
  },
  spacing: {
    xSmall: 4,
    small: 6,
    medium: 8,
    large: 10,
    xLarge: 12,
    xxLarge: 14,
    section: 16,
    content: 20,
    screen: 24,
    spacious: 28,
    wide: 36,
  },
} as const;
