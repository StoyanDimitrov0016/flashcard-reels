// oxlint-disable-next-line import/no-unassigned-import -- Marks this module as server-only for Next.js.
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getInternalPasswordEnvironment } from "@/config/server-environment";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isValidInternalPassword(candidate: string): boolean {
  return timingSafeEqual(
    digest(candidate),
    digest(getInternalPasswordEnvironment().INTERNAL_APP_PASSWORD)
  );
}
