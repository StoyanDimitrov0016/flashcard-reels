export type DeckId = string;
export const deckCoverAssetKeys = [
  "javascript",
  "react",
  "system-design",
  "database",
  "computer-science",
  "operating-systems",
  "cards",
] as const;
export type DeckCoverAsset = (typeof deckCoverAssetKeys)[number];
export type DeckFields = Readonly<{
  id: DeckId;
  title: string;
  description: string;
  coverAsset: DeckCoverAsset;
  createdAt: string;
  updatedAt: string;
}>;

export class Deck {
  public readonly id: DeckId;
  public readonly title: string;
  public readonly description: string;
  public readonly coverAsset: DeckCoverAsset;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  constructor(fields: DeckFields) {
    this.id = fields.id;
    this.title = fields.title;
    this.description = fields.description;
    this.coverAsset = fields.coverAsset;
    this.createdAt = fields.createdAt;
    this.updatedAt = fields.updatedAt;
  }
}
