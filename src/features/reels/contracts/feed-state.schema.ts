import { z } from "zod";

import { FEED_RECENT_CARD_LIMIT } from "@/features/learning-engine";

export const FeedStateSchema = z.object({
  recentCardIds: z.array(z.string()).max(FEED_RECENT_CARD_LIMIT),
});
