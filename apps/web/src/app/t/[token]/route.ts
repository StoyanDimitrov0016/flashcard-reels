import { getDeckLibrary, getDeckStorage } from "@/server/decks";
import { deckDownloadResponse } from "@/server/decks/deck-download-response";
import { logServerError } from "@/server/log";
import { readDeckTransferToken } from "@/server/transfer/transfer-token";

/**
 * Public on purpose: the phone has no portal session. The signed, short-lived token is the
 * authorization, and it resolves to a private download that expires on its own.
 */
export async function GET(_request: Request, context: RouteContext<"/t/[token]">) {
  const { token } = await context.params;
  const deckId = readDeckTransferToken(token);
  if (!deckId) {
    return Response.json({ error: "This deck transfer code has expired" }, { status: 410 });
  }
  try {
    const deck = await getDeckLibrary().findDeck(deckId);
    if (!deck) {
      return Response.json({ error: "Deck not found" }, { status: 404 });
    }
    return deckDownloadResponse(await getDeckStorage().createDownload(deck.key));
  } catch (error) {
    logServerError(`Transfer download failed for deck ${deckId}`, error);
    return Response.json({ error: "Deck download is unavailable" }, { status: 503 });
  }
}
