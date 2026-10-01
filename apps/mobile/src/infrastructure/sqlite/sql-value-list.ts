import { sql } from "drizzle-orm";

/** Domain constants only; never pass learner input to a schema expression. */
export function sqlValueList(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", "));
}
