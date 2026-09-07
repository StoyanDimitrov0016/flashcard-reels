import { z } from "zod";

export const StudySessionScopeSchema = z.enum(["mixed", "focused"]);
export const StudySessionStrategySchema = z.enum(["shuffle", "ordered"]);
