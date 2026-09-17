import { AppError, type AppErrorParams, type ErrorContext } from "@/shared/errors/app-error";

export type StartupErrorCode =
  | "DATABASE_CONFIGURATION_FAILED"
  | "DATABASE_MIGRATION_FAILED"
  | "BUNDLED_DECK_INSTALL_FAILED";

export type StartupErrorParams = Readonly<{
  code: StartupErrorCode;
  message: string;
  cause?: unknown;
  context?: ErrorContext;
}>;

export class StartupError extends AppError {
  constructor({ code, message, cause, context }: StartupErrorParams) {
    super({
      name: "StartupError",
      code,
      message,
      cause,
      context,
    } satisfies AppErrorParams);
  }
}
