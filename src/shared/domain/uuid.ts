import { z } from "zod";

export const UuidSchema = z.compile(z.uuid());
export type Uuid = z.infer<typeof UuidSchema>;
