import { NextResponse } from "next/server";

import { getDeckObjectKey } from "@/lib/deck-catalog";
import { readDeckTransferToken } from "@/lib/deck-transfer-token";
import { createAuthorizedDeckDownload } from "@/lib/r2";

export async function GET(_request: Request, context: RouteContext<"/t/[token]">) {
  const { token } = await context.params;
  const deckId = readDeckTransferToken(token);
  if (!deckId) {
    return NextResponse.json({ error: "This deck transfer code has expired" }, { status: 410 });
  }
  try {
    const download = await createAuthorizedDeckDownload(getDeckObjectKey(deckId));
    return NextResponse.redirect(download.url, 307);
  } catch {
    return NextResponse.json({ error: "Deck download is unavailable" }, { status: 503 });
  }
}
