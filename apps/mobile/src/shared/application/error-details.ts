/** Include causal errors, which Error.stack does not consistently contain on Hermes. */
export function describeError(error: unknown): string {
  const seen = new Set<unknown>();
  const details: string[] = [];
  let current = error;
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    if (!(current instanceof Error)) {
      if (typeof current === "object" && current !== null) {
        try {
          details.push(JSON.stringify(current));
        } catch {
          details.push("Unserializable error details");
        }
      } else if (
        typeof current === "string" ||
        typeof current === "number" ||
        typeof current === "boolean" ||
        typeof current === "bigint" ||
        typeof current === "symbol" ||
        current === null
      ) {
        details.push(String(current));
      } else {
        details.push("Unknown error details");
      }
      break;
    }
    details.push(current.stack ?? `${current.name}: ${current.message}`);
    current = current.cause;
  }
  return details.join("\n\nCaused by:\n");
}
