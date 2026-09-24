import { mutationOptions } from "@tanstack/react-query";
import * as z from "zod";

import { requestJson } from "@/lib/api-client";

const TransferLinkSchema = z.object({ expiresAt: z.iso.datetime(), url: z.url() });

export const transferLinkMutationOptions = mutationOptions({
  mutationFn: (deckId: string) =>
    requestJson(`/api/decks/${deckId}/transfer-link`, {
      fallbackMessage: "The transfer code could not be created. Try again.",
      init: { method: "POST" },
      schema: TransferLinkSchema,
    }),
  mutationKey: ["transfer-link"],
});
