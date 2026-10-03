export const ratingValues = ["again", "hard", "good", "easy"] as const;
export type Rating = (typeof ratingValues)[number];
