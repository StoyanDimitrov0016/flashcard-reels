import "server-only";
import type { DeckDownload } from "@/server/decks/deck-storage";

export function deckDownloadResponse(download: DeckDownload): Response {
  if (download.kind === "redirect") {
    return Response.redirect(download.url, 307);
  }
  return new Response(new Uint8Array(download.bytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${download.fileName}"`,
      "Content-Type": "application/octet-stream",
    },
  });
}
