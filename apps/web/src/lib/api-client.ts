import * as z from "zod";

const ApiErrorSchema = z.object({ error: z.string() });

class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestJsonOptions<T> = Readonly<{
  schema: z.ZodType<T>;
  init?: RequestInit;
  fallbackMessage: string;
}>;

/** Fetches a same-origin JSON endpoint and validates the response at the boundary. */
export async function requestJson<T>(
  url: string,
  { schema, init, fallbackMessage }: RequestJsonOptions<T>
): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    throw new ApiError(parsed.success ? parsed.data.error : fallbackMessage, response.status);
  }
  return schema.parse(body);
}
