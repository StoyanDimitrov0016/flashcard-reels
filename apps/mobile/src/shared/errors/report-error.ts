import { describeError } from "@/shared/errors/describe-error";

export function reportError(error: unknown, scope: string): void {
  let details = "Unable to format error details.";
  try {
    details = describeError(error);
  } catch {
    // Reporting must not make a fallback fail while formatting an unknown value.
  }
  // oxlint-disable-next-line no-console -- This is the single local device-log adapter.
  console.error(`[Flashcard Reels] ${scope}`, details);
}
