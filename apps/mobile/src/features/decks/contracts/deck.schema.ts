import { z } from "zod";

import { deckCoverAssetKeys } from "@/features/decks/domain/deck.model";
import { UuidSchema } from "@/shared/contracts/uuid.schema";

export const DeckIdSchema = UuidSchema;
export const DeckCoverAssetSchema = z.enum(deckCoverAssetKeys);
