import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import * as z from "zod";
import { isValidSessionToken, sessionCookie } from "@/lib/auth/session";
import { readDeckPackage } from "@/lib/deck-package";

const DeckIdSchema = z.compile(z.uuid());

export async function GET(_request: Request, context: { params: Promise<{ deckId: string }> }) {
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
    const deck = await readDeckPackage(result.data);
    return NextResponse.json(deck, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Deck is unavailable" }, { status: 404 });
  }
}
