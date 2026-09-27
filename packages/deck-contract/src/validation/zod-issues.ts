import type { z } from "zod";

import type { DeckParseIssue } from "../errors/deck-parse-issue";

export function toDeckParseIssues(issues: z.ZodError["issues"]): DeckParseIssue[] {
  return issues.map((issue) => ({
    message: issue.message,
    path: issue.path.map((segment) => (typeof segment === "symbol" ? String(segment) : segment)),
  }));
}
