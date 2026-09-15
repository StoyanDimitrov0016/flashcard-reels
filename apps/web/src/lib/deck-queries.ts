import { mutationOptions, queryOptions } from "@tanstack/react-query";
import * as z from "zod";
import { DeckCatalogSchema } from "@/lib/deck-catalog";

export const DownloadResponseSchema = z.compile(z.object({ url: z.url() }));

const fetchDeckCatalog = async () => {
  const response = await fetch("/api/decks", { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error("The deck library could not be loaded.");
  }
  return DeckCatalogSchema.parse(await response.json());
};

const downloadDeck = async (deckId: string) => {
  const response = await fetch("/api/decks/" + deckId + "/download", {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error("Download unavailable. Try again in a moment.");
  }
  return DownloadResponseSchema.parse(await response.json());
};

export const deckCatalogQueryOptions = queryOptions({
  queryKey: ["decks", "catalog"],
  queryFn: fetchDeckCatalog,
  staleTime: 60_000,
});

export const downloadDeckMutationOptions = mutationOptions({
  mutationFn: downloadDeck,
});
