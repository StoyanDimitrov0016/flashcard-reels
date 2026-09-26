const LeadingHeadingPattern = /^\s*#\s+(.+?)\s*#*\s*(?:\r?\n|$)/;

function normalizeTitle(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

/**
 * Lesson pages show the title from deck.json, and authors usually open the Markdown with the same
 * heading. Drop that first heading when it matches so the title is not shown twice.
 */
export function withoutRepeatedTitle(markdown: string, title: string): string {
  const match = LeadingHeadingPattern.exec(markdown);
  if (match?.[1] && normalizeTitle(match[1]) === normalizeTitle(title)) {
    return markdown.slice(match[0].length);
  }
  return markdown;
}
