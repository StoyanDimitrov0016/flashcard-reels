import { AppError, type AppErrorParams } from "./app-error";

export type OperationErrorParams = Readonly<Omit<AppErrorParams, "name">>;

export class OperationError extends AppError {
  constructor({ code, message, cause, context }: OperationErrorParams) {
    super({ name: "OperationError", code, message, cause, context });
  }
}
