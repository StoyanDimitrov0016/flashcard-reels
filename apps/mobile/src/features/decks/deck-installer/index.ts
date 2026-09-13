export type DeckPackageFile = Readonly<{ uri: string }>;

export type DeckInstallResult = Readonly<{
  status: "installed" | "updated" | "no-op";
  deckId: string;
  version: number;
}>;

export class DeckPackageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckPackageValidationError";
  }
}

export class DeckPackageVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckPackageVersionError";
  }
}

/** The complete application-facing deck-installer surface. */
export interface DeckInstaller {
  installFromFile(file: DeckPackageFile): Promise<DeckInstallResult>;
}
