import { hasValidSession } from "@/server/auth/current-session";
import { getDeckLibrary, getDeckStorage } from "@/server/decks";
import { deckDownloadResponse } from "@/server/decks/deck-download-response";
import { logServerError } from "@/server/log";

/** A plain link target: the browser follows it and saves the `.fcrdeck` file. */
export async function GET(_request: Request, context: RouteContext<"/decks/[deckId]/download">) {
  if (!(await hasValidSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { deckId } = await context.params;
  try {
    const deck = await getDeckLibrary().findDeck(deckId);
    if (!deck) {
      return Response.json({ error: "Deck not found" }, { status: 404 });
    }
    return deckDownloadResponse(await getDeckStorage().createDownload(deck.key));
  } catch (error) {
    logServerError(`Download failed for deck ${deckId}`, error);
    return Response.json({ error: "Deck download is unavailable" }, { status: 503 });
  }
}
