import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import type { LearnerProfileRepository } from "@/features/learner-profile/domain/learner-profile.repository";
import type { LearnerProfileService } from "@/features/learner-profile/domain/learner-profile.service";
import type { Clock } from "@/shared/domain/clock";

export class LearnerProfileServiceImpl implements LearnerProfileService {
  private readonly clock: Clock;
  private readonly repository: LearnerProfileRepository;

  constructor(repository: LearnerProfileRepository, clock: Clock) {
    this.repository = repository;
    this.clock = clock;
  }

  async findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, LearnerProfile>> {
    return this.repository.findCurrentByFlashcardIds(flashcardIds);
  }

  async resetCardProgress(flashcardId: string): Promise<void> {
    await this.repository.resetCard(flashcardId, this.clock.now());
  }

  async resetDeckProgress(deckId: DeckId): Promise<void> {
    await this.repository.resetDeck(deckId, this.clock.now());
  }

  async resetAllProgress(): Promise<void> {
    await this.repository.resetAll(this.clock.now());
  }
}
