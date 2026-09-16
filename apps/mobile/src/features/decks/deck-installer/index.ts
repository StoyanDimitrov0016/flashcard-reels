export type DeckPackageFile = Readonly<{ uri: string }>;

export type DeckInstallResult = Readonly<{
  status: "installed" | "updated" | "no-op";
  deckId: string;
  version: number;
}>;

import { AppError } from "../../../shared/errors/app-error.ts";

export class DeckPackageValidationError extends AppError {
  // oxlint-disable-next-line unicorn/custom-error-definition -- Name is supplied as a literal to the shared constructor.
  constructor(message: string, options?: ErrorOptions) {
    super({
      name: "DeckPackageValidationError",
      code: "DECK_PACKAGE_INVALID",
      message,
      cause: options?.cause,
    });
  }
}

export class DeckPackageVersionError extends AppError {
  // oxlint-disable-next-line unicorn/custom-error-definition -- Name is supplied as a literal to the shared constructor.
  constructor(message: string, options?: ErrorOptions) {
    super({
      name: "DeckPackageVersionError",
      code: "DECK_PACKAGE_VERSION_CONFLICT",
      message,
      cause: options?.cause,
    });
  }
}

/** The complete application-facing deck-installer surface. */
export interface DeckInstaller {
  installFromFile(file: DeckPackageFile): Promise<DeckInstallResult>;
}
