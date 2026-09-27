import type { DeckContractErrorContext } from "./deck-error-types";

import { DeckContractError } from "./deck-contract-error";
import { formatDeckParseIssues, type DeckPackageParseIssue } from "./deck-parse-issue";

type ParseErrorOptions = ErrorOptions & { context?: DeckContractErrorContext };

export class DeckPackageParseError extends DeckContractError {
  readonly issues: readonly DeckPackageParseIssue[];

  constructor(issues: readonly DeckPackageParseIssue[], options?: ParseErrorOptions) {
    super({
      name: "DeckPackageParseError",
      code: "DECK_PACKAGE_INVALID",
      message: formatDeckParseIssues(issues),
      cause: options?.cause,
      context: options?.context,
    });
    this.issues = issues;
  }
}
