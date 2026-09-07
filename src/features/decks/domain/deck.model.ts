export type DeckId = string;
export type DeckFields = Readonly<{
  id: DeckId;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}>;

export class Deck {
  public readonly id: DeckId;
  public readonly title: string;
  public readonly description: string;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  constructor(fields: DeckFields) {
    this.id = fields.id;
    this.title = fields.title;
    this.description = fields.description;
    this.createdAt = fields.createdAt;
    this.updatedAt = fields.updatedAt;
  }
}
