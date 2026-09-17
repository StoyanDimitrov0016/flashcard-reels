import { AppError } from "./app-error";
import { OperationError, type OperationErrorParams } from "./operation-error";

export function toError(value: unknown, fallbackMessage: string): Error {
  if (value instanceof Error) {
    return value;
  }
  return new Error(fallbackMessage, { cause: value });
}

export function toOperationError(value: unknown, params: OperationErrorParams): AppError {
  if (value instanceof AppError) {
    return value;
  }
  return new OperationError({ ...params, cause: value });
}
