import type { DeckContractErrorContext } from "./deck-error-types";

import { DeckContractError } from "./deck-contract-error";
import { formatDeckParseIssues, type DeckParseIssue } from "./deck-parse-issue";

type ParseErrorOptions = ErrorOptions & { context?: DeckContractErrorContext };

export class DeckParseError extends DeckContractError {
  readonly issues: readonly DeckParseIssue[];

  constructor(issues: readonly DeckParseIssue[], options?: ParseErrorOptions) {
    super({
      name: "DeckParseError",
      code: "DECK_INVALID",
      message: formatDeckParseIssues(issues),
      cause: options?.cause,
      context: options?.context,
    });
    this.issues = issues;
  }
}
