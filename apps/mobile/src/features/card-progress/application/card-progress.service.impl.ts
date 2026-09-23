import type { LearningProgressResetTransaction } from "@/features/card-progress/application/learning-progress-reset-transaction";
import type { CardProgress } from "@/features/card-progress/domain/card-progress.model";
import type { CardProgressRepository } from "@/features/card-progress/domain/card-progress.repository";
import type { CardProgressService } from "@/features/card-progress/domain/card-progress.service";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";
import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";
import type { Clock } from "@/shared/domain/clock";

export class CardProgressServiceImpl implements CardProgressService {
  private readonly clock: Clock;
  private readonly repository: CardProgressRepository;
  private readonly resetTransaction: LearningProgressResetTransaction;
  private readonly flashcardService: FlashcardService;
  private readonly sessionSettlement: StudySessionSettlement;

  constructor(
    repository: CardProgressRepository,
    clock: Clock,
    resetTransaction: LearningProgressResetTransaction,
    sessionSettlement: StudySessionSettlement,
    flashcardService: FlashcardService
  ) {
    this.repository = repository;
    this.clock = clock;
    this.resetTransaction = resetTransaction;
    this.sessionSettlement = sessionSettlement;
    this.flashcardService = flashcardService;
  }

  async findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, CardProgress>> {
    return this.repository.findIncludingPendingRatingsByFlashcardIds(flashcardIds);
  }

  async resetCardProgress(flashcardId: string): Promise<void> {
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
