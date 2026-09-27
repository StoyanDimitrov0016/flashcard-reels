export type DeckValidationIssue = Readonly<{
  path: readonly (string | number)[];
  message: string;
}>;

export class DeckValidationError extends Error {
  readonly issues: readonly DeckValidationIssue[];

  constructor(issues: readonly DeckValidationIssue[]) {
    super(issues.map(({ path, message }) => `${path.join(".")}: ${message}`).join("\n"));
    this.name = "DeckValidationError";
    this.issues = issues;
  }
}
