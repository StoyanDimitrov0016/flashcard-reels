import "server-only";
import * as z from "zod";

function isSecureOrPrivateOrigin(value: string): boolean {
  const url = new URL(value);
  if (url.protocol === "https:") {
    return true;
  }
  const hostname = url.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

const InternalPasswordEnvironmentSchema = z.compile(
  z.object({ INTERNAL_APP_PASSWORD: z.string().min(12) })
);
const SessionEnvironmentSchema = z.compile(z.object({ AUTH_SESSION_SECRET: z.string().min(32) }));
const R2EnvironmentSchema = z.compile(
  z.object({
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
  })
);
export const DeckTransferEnvironmentSchema = z.compile(
  z.object({
    DECK_TRANSFER_ORIGIN: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .url({ protocol: /^https?$/ })
        .refine(isSecureOrPrivateOrigin, "Use HTTPS or a private development origin.")
        .optional()
    ),
  })
);

const LocalDeckStorageEnvironmentSchema = z.compile(
  z.object({
    LOCAL_DECKS_DIR: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(1).optional()
    ),
  })
);

export type DeckStorageEnvironment =
  | Readonly<{ kind: "local"; directory: string }>
  | Readonly<{ kind: "r2" }>;

/**
 * Development can serve `.fcrdeck` files from a local folder instead of R2. Production always
 * uses R2, so a stray `LOCAL_DECKS_DIR` cannot replace the published catalog.
 */
export function getDeckStorageEnvironment(): DeckStorageEnvironment {
  const { LOCAL_DECKS_DIR } = LocalDeckStorageEnvironmentSchema.parse(process.env);
  if (LOCAL_DECKS_DIR && process.env.NODE_ENV !== "production") {
    return { directory: LOCAL_DECKS_DIR, kind: "local" };
  }
  return { kind: "r2" };
}

export function getInternalPasswordEnvironment() {
  return InternalPasswordEnvironmentSchema.parse(process.env);
}
export function getSessionEnvironment() {
  return SessionEnvironmentSchema.parse(process.env);
}
export function getR2Environment() {
  return R2EnvironmentSchema.parse(process.env);
}
export function getDeckTransferEnvironment() {
  return DeckTransferEnvironmentSchema.parse(process.env);
}
