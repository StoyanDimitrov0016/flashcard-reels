import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import * as z from "zod";
import { isValidSessionToken, sessionCookie } from "@/lib/auth/session";
import { createAuthorizedDeckDownload } from "@/lib/r2";

const DeckIdSchema = z.compile(z.uuid());

export async function GET(
  _request: Request,
  context: RouteContext<"/api/decks/[deckId]/download">
) {
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
    const download = await createAuthorizedDeckDownload(`decks/${result.data}.fcrdeck`);
    return NextResponse.json(download, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Deck download is unavailable" }, { status: 503 });
  }
}
