import type { DeckPackageDownloader } from "@/features/decks/application/deck-package-downloader";
import type { DeckPackagePicker } from "@/features/decks/application/deck-package-picker";
import type { SavedProgressService } from "@/features/decks/application/saved-progress.service";
import type { DeckInstaller } from "@/features/decks/deck-installer";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardProgressService } from "@/features/flashcard-progress/domain/flashcard-progress.service";
import type { FlashcardService } from "@/features/flashcards/domain/flashcard.service";

import { useAppServices } from "@/infrastructure/app-services";

export type DecksCapability = Readonly<{
  deckInstaller: DeckInstaller;
  deckPackageDownloader: DeckPackageDownloader;
  deckPackagePicker: DeckPackagePicker;
  deckService: DeckService;
  savedProgressService: SavedProgressService;
  flashcardService: FlashcardService;
  flashcardProgressService: FlashcardProgressService;
}>;

export function useDecks(): DecksCapability {
  const {
    deckInstaller,
    deckPackageDownloader,
    deckPackagePicker,
    deckService,
    savedProgressService,
    flashcardService,
    flashcardProgressService,
  } = useAppServices();

  return {
    deckInstaller,
    deckPackageDownloader,
    deckPackagePicker,
    deckService,
    savedProgressService,
    flashcardService,
    flashcardProgressService,
  };
}
