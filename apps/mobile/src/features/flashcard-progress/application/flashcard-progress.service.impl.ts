import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LearningProgressResetTransaction } from "@/features/flashcard-progress/application/learning-progress-reset-transaction";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { FlashcardProgressQuery } from "@/features/flashcard-progress/domain/flashcard-progress.query";
import type { FlashcardProgressService } from "@/features/flashcard-progress/domain/flashcard-progress.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";
import type { Clock } from "@/shared/domain/clock";

export class FlashcardProgressServiceImpl implements FlashcardProgressService {
  private readonly clock: Clock;
  private readonly progressQuery: FlashcardProgressQuery;
  private readonly resetTransaction: LearningProgressResetTransaction;
  private readonly flashcardService: FlashcardService;
  private readonly sessionSettlement: StudySessionSettlement;

  constructor(
    progressQuery: FlashcardProgressQuery,
    clock: Clock,
    resetTransaction: LearningProgressResetTransaction,
    sessionSettlement: StudySessionSettlement,
    flashcardService: FlashcardService
  ) {
    this.progressQuery = progressQuery;
    this.clock = clock;
    this.resetTransaction = resetTransaction;
    this.sessionSettlement = sessionSettlement;
    this.flashcardService = flashcardService;
  }

  async findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, FlashcardProgress>> {
    return this.progressQuery.findIncludingPendingRatingsByFlashcardIds(flashcardIds);
  }

  async resetFlashcardProgress(flashcardId: string): Promise<void> {
    const card = await this.flashcardService.findById(flashcardId);
    if (card) {
      await this.sessionSettlement.settleActiveSessionsAffectedByDeck(card.deckId, true);
    }
    await this.resetTransaction.resetCard(flashcardId, this.clock.now());
  }

  async resetDeckProgress(deckId: DeckId): Promise<void> {
    await this.sessionSettlement.settleActiveSessionsAffectedByDeck(deckId, true);
    await this.resetTransaction.resetDeck(deckId, this.clock.now());
  }

  async resetAllProgress(): Promise<void> {
    await this.resetTransaction.resetAll(this.clock.now());
  }
}
