export type DeckContractErrorCode = "DECK_INVALID" | "DECK_PACKAGE_INVALID";

export type DeckContractErrorContext = Readonly<Record<string, string | number | boolean | null>>;
