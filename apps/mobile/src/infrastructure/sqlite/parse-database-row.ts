import type { z } from "zod";

import { OperationError } from "@/shared/errors/operation-error";

export function parseDatabaseRow<T>(
  schema: z.ZodType<T>,
  value: unknown,
  table: string,
  rowId: string
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new OperationError({
      code: "DATABASE_ROW_INVALID",
      context: { table, rowId },
      cause: result.error,
      message: `Invalid row in ${table}: ${rowId}`,
    });
  }
  return result.data;
}
