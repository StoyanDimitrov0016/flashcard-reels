export type DeckContractErrorCode = "DECK_SCHEMA_UNSUPPORTED" | "DECK_PACKAGE_INVALID";

export type DeckContractErrorContext = Readonly<Record<string, string | number | boolean | null>>;
