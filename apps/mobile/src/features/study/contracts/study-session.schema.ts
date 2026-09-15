import { z } from "zod";

export const StudySessionScopeSchema = z.enum(["mixed", "focused"]);
