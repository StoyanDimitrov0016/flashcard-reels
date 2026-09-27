export type DeckPackageFile = Readonly<{ uri: string }>;

export type DeckInstallResult = Readonly<{
  status: "installed" | "updated" | "no-op";
  deckId: string;
  revision: number;
}>;

import { AppError } from "../../../shared/errors/app-error.ts";

export class DeckPackageRevisionError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super({
      name: "DeckPackageRevisionError",
      code: "DECK_PACKAGE_REVISION_CONFLICT",
      message,
      cause: options?.cause,
    });
  }
}

export class DeckPackageAuthorError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super({
      name: "DeckPackageAuthorError",
      code: "DECK_PACKAGE_AUTHOR_CONFLICT",
      message,
      cause: options?.cause,
    });
  }
}

/** The complete application-facing deck-installer surface. */
export interface DeckInstaller {
  installFromFile(file: DeckPackageFile): Promise<DeckInstallResult>;
}
