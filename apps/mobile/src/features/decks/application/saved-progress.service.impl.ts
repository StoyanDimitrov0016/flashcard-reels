import type { SavedProgressDeletionTransaction } from "@/features/decks/application/saved-progress-deletion.transaction";
import type { SavedProgressService } from "@/features/decks/application/saved-progress.service";
import type { ArchivedProgressQuery } from "@/features/decks/domain/archived-progress.query";
import type { DeckProgressRepository } from "@/features/decks/domain/deck-progress.repository";
import type { DeckId } from "@/features/decks/domain/deck.model";

export class SavedProgressServiceImpl implements SavedProgressService {
  private readonly archivedProgressQuery: ArchivedProgressQuery;
  private readonly deckProgressRepository: DeckProgressRepository;
  private readonly deletionTransaction: SavedProgressDeletionTransaction;

  constructor(
    archivedProgressQuery: ArchivedProgressQuery,
    deckProgressRepository: DeckProgressRepository,
    deletionTransaction: SavedProgressDeletionTransaction
  ) {
    this.archivedProgressQuery = archivedProgressQuery;
    this.deckProgressRepository = deckProgressRepository;
    this.deletionTransaction = deletionTransaction;
  }

  async listArchivedProgress() {
    return this.archivedProgressQuery.listArchivedProgress();
  }

  async listPendingProgress() {
    return this.deckProgressRepository.listPending();
  }

  async continueProgress(id: DeckId): Promise<void> {
    await this.deckProgressRepository.continueProgress(id);
  }

  async deleteProgress(id: DeckId): Promise<void> {
    await this.deletionTransaction.deleteProgress(id);
  }
}
