import { getDeckTransferEnvironment } from "@/config/server-environment";

export function resolveDeckTransferOrigin(requestUrl: string): string | null {
  const configuredOrigin = getDeckTransferEnvironment().DECK_TRANSFER_ORIGIN;
  if (configuredOrigin) {
    return new URL(configuredOrigin).origin;
  }

  const origin = new URL(requestUrl);
  return origin.protocol === "https:" ? origin.origin : null;
}
