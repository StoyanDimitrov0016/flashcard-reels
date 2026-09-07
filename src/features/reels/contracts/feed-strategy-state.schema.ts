import { z } from "zod";

export const FeedStrategyStateSchema = z.object({
  cursor: z.number().int().nonnegative().default(0),
  cycle: z.array(z.string()).default([]),
});

export type FeedStrategyState = Readonly<z.infer<typeof FeedStrategyStateSchema>>;
