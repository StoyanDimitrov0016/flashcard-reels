import { hasValidSession } from "@/server/auth/current-session";
import { getDeckLibrary, getDeckStorage } from "@/server/decks";
import { logServerError } from "@/server/log";
import { resolveDeckTransferOrigin } from "@/server/transfer/transfer-origin";
import { createDeckTransferToken, TRANSFER_TTL_MS } from "@/server/transfer/transfer-token";

const noStore = { "Cache-Control": "private, no-store" };

/** Creates the short-lived link the portal shows as a QR code for the mobile app. */
export async function POST(
  request: Request,
  context: RouteContext<"/api/decks/[deckId]/transfer-link">
) {
  if (!(await hasValidSession())) {
    return Response.json({ error: "Unauthorized" }, { headers: noStore, status: 401 });
  }
  const { deckId } = await context.params;
  try {
    const deck = await getDeckLibrary().findDeck(deckId);
    if (!deck) {
      return Response.json({ error: "Deck not found" }, { headers: noStore, status: 404 });
    }
    const expiresAt = new Date(Date.now() + TRANSFER_TTL_MS).toISOString();
    const transferPath = `/t/${createDeckTransferToken(deck.id)}`;
    const transferOrigin = resolveDeckTransferOrigin(request.url);
    let url: string;
    if (transferOrigin) {
      url = new URL(transferPath, transferOrigin).toString();
    } else {
      // Without an HTTPS origin a phone may not reach this server, so prefer storage's own link.
      const download = await getDeckStorage().createDownload(deck.key);
      url =
        download.kind === "redirect"
          ? download.url
          : new URL(transferPath, new URL(request.url).origin).toString();
    }
    return Response.json({ expiresAt, url }, { headers: noStore });
  } catch (error) {
    logServerError(`Transfer link failed for deck ${deckId}`, error);
    return Response.json({ error: "Transfer is unavailable" }, { headers: noStore, status: 503 });
  }
}
