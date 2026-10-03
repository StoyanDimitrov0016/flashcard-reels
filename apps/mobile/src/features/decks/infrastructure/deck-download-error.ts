import type { AppErrorCode } from "@/shared/errors/app-error-code";

// Native reasons: Android "HTTP nnn", iOS DownloadTask "server returned HTTP nnn".
const DownloadHttpStatusPattern = /(?:^|:\s)(?:server returned )?HTTP (\d{3})$/;

export function getDeckDownloadErrorCode(cause: unknown): AppErrorCode {
  const status =
    cause instanceof Error ? Number(DownloadHttpStatusPattern.exec(cause.message)?.[1]) : NaN;
  if (status === 404 || status === 410) {
    return "DECK_DOWNLOAD_EXPIRED";
  }
  if (status >= 500 && status <= 599) {
    return "DECK_DOWNLOAD_UNAVAILABLE";
  }
  return "DECK_DOWNLOAD_FAILED";
}
