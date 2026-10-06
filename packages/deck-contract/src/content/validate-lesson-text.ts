import { Lexer, type Token } from "marked";

import type { DeckPackageParseIssue } from "../errors/deck-parse-issue.ts";

const AllowedTokens = new Set([
  "space",
  "paragraph",
  "text",
  "escape",
  "list",
  "list_item",
  "code",
  "codespan",
  "strong",
  "em",
  "br",
]);
type LessonTextOptions = Readonly<{
  body: string;
  path: string;
  lessonId: string;
  sectionId: string | null;
}>;

/** Locate children in their parent's raw source, retaining file lines through nested lists. */
export function validateLessonText({
  body,
  path,
  lessonId,
  sectionId,
}: LessonTextOptions): DeckPackageParseIssue[] {
  const issues: DeckPackageParseIssue[] = [];
  const source = body.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  function walk(tokens: readonly Token[], parent: string, parentLine: number) {
    let cursor = 0;
    for (const token of tokens) {
      const position = parent.indexOf(token.raw, cursor);
      const start = position < 0 ? cursor : position;
      const line = parentLine + parent.slice(0, start).split("\n").length - 1;
      cursor = start + token.raw.length;
      if (!AllowedTokens.has(token.type)) {
        issues.push({
          path: [path],
          lessonId,
          sectionId,
          line,
          message: `Disallowed Markdown ${token.type} in lesson ${lessonId}, ${sectionId ?? "intro"}, line ${line}`,
        });
      }
      if ("items" in token && token.type === "list") {
        walk(token.items, token.raw, line);
      }
      if ("tokens" in token && token.tokens) {
        walk(token.tokens, token.raw, line);
      }
    }
  }
  walk(Lexer.lex(source, { gfm: true }), source, 1);
  return issues;
}
