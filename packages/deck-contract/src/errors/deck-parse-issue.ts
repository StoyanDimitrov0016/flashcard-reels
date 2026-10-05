export type DeckParseIssue = Readonly<{
  path: readonly (string | number)[];
  message: string;
}>;

export type DeckPackageParseIssue = DeckParseIssue &
  Readonly<{
    lessonId?: string;
    sectionId?: string | null;
    line?: number;
  }>;

export function formatDeckParseIssues(issues: readonly DeckParseIssue[]): string {
  return issues
    .map(({ path, message }) => `${path.length > 0 ? `${path.join(".")}: ` : ""}${message}`)
    .join("\n");
}
