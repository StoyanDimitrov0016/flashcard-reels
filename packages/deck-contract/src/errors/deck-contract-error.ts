import type { DeckContractErrorCode, DeckContractErrorContext } from "./deck-error-types";

type DeckContractErrorParams = Readonly<{
  name: string;
  code: DeckContractErrorCode;
  message: string;
  cause?: unknown;
  context?: DeckContractErrorContext;
}>;

/** Shared error shape for callers in mobile, web, and other package consumers. */
export class DeckContractError extends Error {
  readonly code: DeckContractErrorCode;
  readonly context: DeckContractErrorContext | undefined;

  constructor({ name, code, message, cause, context }: DeckContractErrorParams) {
    super(message, { cause });
    this.name = name;
    this.code = code;
    this.context = context;
  }
}
