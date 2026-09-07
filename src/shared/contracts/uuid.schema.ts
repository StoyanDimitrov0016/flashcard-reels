import { z } from "zod";

export const UuidSchema = z.compile(z.uuid());
