import { z } from "zod";

export const RecallLevelSchema = z.compile(z.enum(["again", "hard", "good", "easy"]));
export type RecallLevel = z.infer<typeof RecallLevelSchema>;
