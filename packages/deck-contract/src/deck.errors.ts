export type DeckParseIssue = Readonly<{
  path: readonly (string | number)[];
  message: string;
}>;

function formatDeckParseIssues(issues: readonly DeckParseIssue[]): string {
  return issues
    .map(({ path, message }) => `${path.length > 0 ? `${path.join(".")}: ` : ""}${message}`)
    .join("\n");
}

export class DeckParseError extends Error {
  readonly issues: readonly DeckParseIssue[];

  constructor(issues: readonly DeckParseIssue[], options?: ErrorOptions) {
    super(formatDeckParseIssues(issues), options);
    this.name = "DeckParseError";
    this.issues = issues;
  }
}
