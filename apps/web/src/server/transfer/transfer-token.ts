import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import * as z from "zod";

import { getSessionEnvironment } from "@/server/env";

/** How long a phone-transfer link stays valid. */
export const TRANSFER_TTL_MS = 10 * 60 * 1000;
const SIGNATURE_BYTES = 16;
const CompactDeckIdSchema = z.compile(z.string().regex(/^[0-9a-f]{32}$/));
const ExpirySchema = z.compile(z.string().regex(/^[0-9a-z]+$/));

function signature(payload: string): Buffer {
  return createHmac("sha256", getSessionEnvironment().AUTH_SESSION_SECRET)
    .update("deck-transfer:")
    .update(payload)
    .digest()
    .subarray(0, SIGNATURE_BYTES);
}

function compactDeckId(deckId: string): string {
  return deckId.replaceAll("-", "");
}

function expandDeckId(value: string): string {
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function createDeckTransferToken(deckId: string): string {
  const payload = `${compactDeckId(deckId)}.${Math.floor(Date.now() + TRANSFER_TTL_MS).toString(36)}`;
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function readDeckTransferToken(token: string): string | null {
  const [compactId, encodedExpiry, suppliedSignature, extra] = token.split(".");
  if (extra || !suppliedSignature) {
    return null;
  }
  const idResult = CompactDeckIdSchema.safeParse(compactId);
  const expiryResult = ExpirySchema.safeParse(encodedExpiry);
  if (!idResult.success || !expiryResult.success) {
    return null;
  }
  const expiresAt = Number.parseInt(expiryResult.data, 36);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }
  const payload = `${idResult.data}.${expiryResult.data}`;
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  const expected = signature(payload);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }
  return expandDeckId(idResult.data);
}
