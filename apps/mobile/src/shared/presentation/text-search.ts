/** Whether any text contains the query, ignoring case and surrounding spaces. Empty matches all. */
export function matchesSearchText(query: string, ...texts: readonly string[]): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  return (
    normalized.length === 0 || texts.some((text) => text.toLocaleLowerCase().includes(normalized))
  );
}
