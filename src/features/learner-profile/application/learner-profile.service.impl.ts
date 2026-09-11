import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import type { LearnerProfileRepository } from "@/features/learner-profile/domain/learner-profile.repository";
import type { LearnerProfileService } from "@/features/learner-profile/domain/learner-profile.service";
import type { LearningProgressResetTransaction } from "@/features/learner-profile/application/learning-progress-reset-transaction";
import type { Clock } from "@/shared/domain/clock";

export class LearnerProfileServiceImpl implements LearnerProfileService {
  private readonly clock: Clock;
  private readonly repository: LearnerProfileRepository;
  private readonly resetTransaction: LearningProgressResetTransaction;

  constructor(
    repository: LearnerProfileRepository,
    clock: Clock,
    resetTransaction: LearningProgressResetTransaction | null = null
  ) {
    this.repository = repository;
    this.clock = clock;
    this.resetTransaction = resetTransaction ?? repository;
  }

  async findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, LearnerProfile>> {
    return this.repository.findCurrentByFlashcardIds(flashcardIds);
  }

  async resetCardProgress(flashcardId: string): Promise<void> {
    await this.resetTransaction.resetCard(flashcardId, this.clock.now());
  }

  async resetDeckProgress(deckId: DeckId): Promise<void> {
    await this.resetTransaction.resetDeck(deckId, this.clock.now());
  }

  async resetAllProgress(): Promise<void> {
    await this.resetTransaction.resetAll(this.clock.now());
  }
}
