import type { DeckId } from "@/features/decks/domain/deck.model";

export type StudySessionScope = "mixed" | "focused";
export type StudySessionFields = Readonly<{
  completedAt: string | null;
  aggregatedThroughReelPosition: number;
  createdAt: string;
  currentReelPosition: number;
  deckId: DeckId | null;
  id: string;
  lastActiveAt: string;
  scope: StudySessionScope;
  feedState: string;
}>;

export class StudySession {
  public readonly id: string;
  public readonly lastActiveAt: string;
  public readonly scope: StudySessionScope;
  public readonly feedState: string;
  public readonly deckId: DeckId | null;
  public readonly currentReelPosition: number;
  public readonly createdAt: string;
  public readonly completedAt: string | null;
  public readonly aggregatedThroughReelPosition: number;

  constructor(fields: StudySessionFields) {
    this.completedAt = fields.completedAt;
    this.aggregatedThroughReelPosition = fields.aggregatedThroughReelPosition;
    this.createdAt = fields.createdAt;
    this.currentReelPosition = fields.currentReelPosition;
    this.deckId = fields.deckId;
    this.id = fields.id;
    this.lastActiveAt = fields.lastActiveAt;
    this.scope = fields.scope;
    this.feedState = fields.feedState;
  }
}
