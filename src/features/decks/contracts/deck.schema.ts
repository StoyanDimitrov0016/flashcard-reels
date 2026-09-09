import { UuidSchema } from "@/shared/contracts/uuid.schema";
import { z } from "zod";

import { deckCoverAssetKeys } from "@/features/decks/domain/deck.model";

export const DeckIdSchema = UuidSchema;
export const DeckCoverAssetSchema = z.enum(deckCoverAssetKeys);
