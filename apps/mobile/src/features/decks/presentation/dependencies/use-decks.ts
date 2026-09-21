import type { DeckPackageDownloader } from "@/features/decks/application/deck-package-downloader";
import type { DeckPackagePicker } from "@/features/decks/application/deck-package-picker";
import type { DeckInstaller } from "@/features/decks/deck-installer";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";
import type { LearnerProfileService } from "@/features/learner-profile/domain/learner-profile.service";

import { useAppServices } from "@/infrastructure/app-services";

export type DecksCapability = Readonly<{
  deckInstaller: DeckInstaller;
  deckPackageDownloader: DeckPackageDownloader;
  deckPackagePicker: DeckPackagePicker;
  deckService: DeckService;
  flashcardService: FlashcardService;
  learnerProfileService: LearnerProfileService;
}>;

export function useDecks(): DecksCapability {
  const {
    deckInstaller,
    deckPackageDownloader,
    deckPackagePicker,
    deckService,
    flashcardService,
    learnerProfileService,
  } = useAppServices();

  return {
    deckInstaller,
    deckPackageDownloader,
    deckPackagePicker,
    deckService,
    flashcardService,
    learnerProfileService,
  };
}
