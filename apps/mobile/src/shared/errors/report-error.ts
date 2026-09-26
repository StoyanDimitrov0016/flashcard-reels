import { describeError } from "@/shared/errors/describe-error";

export function reportError(error: unknown, scope: string): void {
  let summary = "Unable to format error details.";
  let details = "Unable to format error details.";
  try {
    summary = describeError(error, { includeStack: false });
    details = describeError(error);
  } catch {
    // Reporting must not make a fallback fail while formatting an unknown value.
  }
  // Expo replaces stack-bearing arguments with symbolicated frames, so messages must be separate.
  // oxlint-disable-next-line no-console -- This is the single local device-log adapter.
  console.error(`[Flashcard Reels] ${scope}\n${summary}`, details);
}
