import { type z } from "zod";

import { UuidSchema } from "@/shared/contracts/uuid.schema";

export const DeckIdSchema = UuidSchema;
export type DeckId = z.infer<typeof DeckIdSchema>;
