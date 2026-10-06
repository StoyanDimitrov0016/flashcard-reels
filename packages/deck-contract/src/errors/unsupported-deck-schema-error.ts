import { DECK_SCHEMA_VERSION } from "../deck.constants.ts";
import { DeckContractError } from "./deck-contract-error.ts";

export class UnsupportedDeckSchemaError extends DeckContractError {
  constructor(schema: number) {
    super({
      name: "UnsupportedDeckSchemaError",
      code: "DECK_SCHEMA_UNSUPPORTED",
      message: `Unsupported deck schema: ${schema}. Expected schema ${DECK_SCHEMA_VERSION}.`,
      context: { schema },
    });
  }
}
