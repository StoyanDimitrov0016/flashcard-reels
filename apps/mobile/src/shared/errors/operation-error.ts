import { AppError, type AppErrorParams } from "./app-error";

export type OperationErrorParams = Readonly<Omit<AppErrorParams, "name">>;

export class OperationError extends AppError {
  // oxlint-disable-next-line unicorn/custom-error-definition -- Name is supplied as a literal to the shared constructor.
  constructor({ code, message, cause, context }: OperationErrorParams) {
    super({ name: "OperationError", code, message, cause, context });
  }
}
