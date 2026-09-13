import * as z from "zod";

export const InternalPasswordEnvironmentSchema = z.compile(
  z.object({ INTERNAL_APP_PASSWORD: z.string().min(12) }),
);
export const SessionEnvironmentSchema = z.compile(
  z.object({ AUTH_SESSION_SECRET: z.string().min(32) }),
);
export const R2EnvironmentSchema = z.compile(
  z.object({
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
  }),
);

export function getInternalPasswordEnvironment() {
  return InternalPasswordEnvironmentSchema.parse(process.env);
}
export function getSessionEnvironment() {
  return SessionEnvironmentSchema.parse(process.env);
}
export function getR2Environment() {
  return R2EnvironmentSchema.parse(process.env);
}
