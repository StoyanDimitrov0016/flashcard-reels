import { NextResponse } from "next/server";
import { deckCatalog } from "@/lib/deck-catalog";

export function GET() {
  return NextResponse.json(deckCatalog);
}
