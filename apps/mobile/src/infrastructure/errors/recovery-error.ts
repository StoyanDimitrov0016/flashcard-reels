import { AppError, type ErrorContext } from "@/shared/errors/app-error";

export type RecoveryErrorCode =
  | "APP_RESET_APPLY_FAILED"
  | "APP_RESET_REQUEST_FAILED"
  | "APP_RESET_UNSUPPORTED";

export type RecoveryErrorParams = Readonly<{
  code: RecoveryErrorCode;
  message: string;
  cause?: unknown;
  context?: ErrorContext;
}>;

export class RecoveryError extends AppError {
  // oxlint-disable-next-line unicorn/custom-error-definition -- Name is supplied as a literal to the shared constructor.
  constructor({ code, message, cause, context }: RecoveryErrorParams) {
    super({
      name: "RecoveryError",
      code,
      message,
      cause,
      context,
    });
  }
}
