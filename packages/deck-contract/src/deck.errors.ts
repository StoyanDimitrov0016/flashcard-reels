import type { DeckContractErrorCode, DeckContractErrorContext } from "./deck.error-types";

export type DeckParseIssue = Readonly<{
  path: readonly (string | number)[];
  message: string;
}>;

export type DeckPackageParseIssue = DeckParseIssue;

function formatIssues(issues: readonly DeckParseIssue[]): string {
  return issues
    .map(({ path, message }) => `${path.length > 0 ? `${path.join(".")}: ` : ""}${message}`)
    .join("\n");
}

export class DeckParseError extends Error {
  readonly code: DeckContractErrorCode = "DECK_INVALID";
  readonly context: DeckContractErrorContext | undefined;
  readonly issues: readonly DeckParseIssue[];

  constructor(
    issues: readonly DeckParseIssue[],
    options?: ErrorOptions & { context?: DeckContractErrorContext }
  ) {
    super(formatIssues(issues), options);
    this.name = "DeckParseError";
    this.context = options?.context;
    this.issues = issues;
  }
}

export class DeckPackageParseError extends Error {
  readonly code = "DECK_PACKAGE_INVALID" as const;
  readonly context: DeckContractErrorContext | undefined;
  readonly issues: readonly DeckPackageParseIssue[];

  constructor(
    issues: readonly DeckPackageParseIssue[],
    options?: ErrorOptions & { context?: DeckContractErrorContext }
  ) {
    super(formatIssues(issues), options);
    this.name = "DeckPackageParseError";
    this.context = options?.context;
    this.issues = issues;
  }
}

export function rejectDeckPackage(message: string, path: readonly (string | number)[] = []): never {
  throw new DeckPackageParseError([{ path, message }]);
}
