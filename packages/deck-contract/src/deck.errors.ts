export type DeckParseIssue = Readonly<{
  path: readonly (string | number)[];
  message: string;
}>;

export class DeckParseError extends Error {
  readonly issues: readonly DeckParseIssue[];

  constructor(issues: readonly DeckParseIssue[], options?: ErrorOptions) {
    super(
      issues
        .map(({ path, message }) => `${path.length > 0 ? `${path.join(".")}: ` : ""}${message}`)
        .join("\n"),
      options
    );
    this.name = "DeckParseError";
    this.issues = issues;
  }
}
