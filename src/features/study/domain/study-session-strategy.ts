import { z } from "zod";

export const StudySessionStrategySchema = z.enum(["shuffle", "ordered"]);
export type StudySessionStrategy = z.infer<typeof StudySessionStrategySchema>;
