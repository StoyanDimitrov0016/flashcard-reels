import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

import { getInternalPasswordEnvironment } from "@/server/env";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isValidInternalPassword(candidate: string): boolean {
  return timingSafeEqual(
    digest(candidate),
    digest(getInternalPasswordEnvironment().INTERNAL_APP_PASSWORD)
  );
}
