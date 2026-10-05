import { DeckContractError } from "./deck-contract-error.ts";

export class UnsupportedDeckSchemaError extends DeckContractError {
  constructor(schema: number) {
    super({
      name: "UnsupportedDeckSchemaError",
      code: "DECK_SCHEMA_UNSUPPORTED",
      message: `Unsupported deck schema: ${schema}. Expected schema 4.`,
      context: { schema },
    });
  }
}
