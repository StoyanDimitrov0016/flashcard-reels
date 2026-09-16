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
