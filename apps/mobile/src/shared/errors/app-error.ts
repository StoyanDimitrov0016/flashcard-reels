import type { AppErrorCode } from "./app-error-code";

export type ErrorContext = Readonly<Record<string, string | number | boolean | null>>;

export type AppErrorParams = Readonly<{
  name: string;
  code: AppErrorCode;
  message: string;
  cause?: unknown;
  context?: ErrorContext;
}>;

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly context: ErrorContext | undefined;

  constructor({ name, code, message, cause, context }: AppErrorParams) {
    super(message, { cause });
    this.name = name;
    this.code = code;
    this.context = context;
  }
}
