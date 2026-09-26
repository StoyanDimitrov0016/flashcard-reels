import { AppError } from "@/shared/errors/app-error";

const MAX_CAUSE_DEPTH = 8;
const MAX_OUTPUT_LENGTH = 16 * 1024;

type DescribeErrorOptions = Readonly<{
  includeStack?: boolean;
}>;

/** Include causal errors, which Error.stack does not consistently contain on Hermes. */
export function describeError(
  error: unknown,
  { includeStack = true }: DescribeErrorOptions = {}
): string {
  const seen = new Set<unknown>();
  const details: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (current === undefined) {
      if (details.length === 0) {
        details.push("Unknown error details");
      }
      break;
    }
    if (seen.has(current)) {
      break;
    }
    seen.add(current);

    if (current instanceof Error) {
      details.push(describeException(current, includeStack));
      current = current.cause;
      continue;
    }

    details.push(describeUnknown(current));
    break;
  }

  if (current !== undefined && !seen.has(current)) {
    details.push("Cause chain truncated");
  }

  return truncate(details.join("\n\nCaused by:\n"));
}

function describeException(error: Error, includeStack: boolean): string {
  const identity = `${error.name}: ${error.message}`;
  if (error instanceof AppError) {
    const context = error.context ? `\nContext: ${safeSerialize(error.context)}` : "";
    const stack = includeStack && error.stack ? `\n${error.stack}` : "";
    return `${identity}\nCode: ${error.code}${context}${stack}`;
  }
  if (!includeStack || !error.stack) {
    return identity;
  }
  return error.stack.startsWith(identity) ? error.stack : `${identity}\n${error.stack}`;
}

function describeUnknown(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "object") {
    return safeSerialize(value);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "bigint" || typeof value === "symbol") {
    return String(value);
  }
  return "Unknown error details";
}

function safeSerialize(value: object): string {
  try {
    return JSON.stringify(value) ?? "undefined";
  } catch {
    return "Unserializable error details";
  }
}

function truncate(value: string): string {
  if (value.length <= MAX_OUTPUT_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_OUTPUT_LENGTH - 24)}\n…details truncated…`;
}
