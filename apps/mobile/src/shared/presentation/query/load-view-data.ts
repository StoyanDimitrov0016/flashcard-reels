import type { ErrorContext } from "@/shared/errors/app-error";

import { toOperationError } from "@/shared/errors/normalize-error";

type ViewLoadFailure = Readonly<{
  operation: string;
  message: string;
  context?: ErrorContext;
}>;

/** Runs a query's read and turns any failure into the view error its route boundary shows. */
export async function loadViewData<T>(
  failure: ViewLoadFailure,
  load: () => Promise<T>
): Promise<T> {
  try {
    return await load();
  } catch (cause) {
    throw toOperationError(cause, {
      code: "VIEW_LOAD_FAILED",
      context: { ...failure.context, operation: failure.operation },
      message: failure.message,
    });
  }
}
