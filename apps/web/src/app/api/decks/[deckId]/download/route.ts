import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import * as z from "zod";

import { isValidSessionToken, sessionCookie } from "@/lib/auth/session";
import { getDeckObjectKey } from "@/lib/deck-catalog";
import { resolveDeckTransferOrigin } from "@/lib/deck-transfer-origin";
import { createDeckTransferToken } from "@/lib/deck-transfer-token";
import { createAuthorizedDeckDownload } from "@/lib/r2";

const DeckIdSchema = z.compile(z.uuid());

export async function GET(request: Request, context: RouteContext<"/api/decks/[deckId]/download">) {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookie.name)?.value;
  if (!(await isValidSessionToken(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const result = DeckIdSchema.safeParse(params.deckId);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid deck ID" }, { status: 400 });
  }

  try {
    const objectKey = getDeckObjectKey(result.data);
    const transferOrigin = resolveDeckTransferOrigin(request.url);
    let url: string;
    if (transferOrigin) {
      url = new URL(`/t/${createDeckTransferToken(result.data)}`, transferOrigin).toString();
    } else {
      const download = await createAuthorizedDeckDownload(objectKey);
      url = download.url;
    }
    return NextResponse.json({ url }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Deck download is unavailable" }, { status: 503 });
  }
}
