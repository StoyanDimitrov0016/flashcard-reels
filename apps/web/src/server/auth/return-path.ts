const DefaultReturnPath = "/";

/**
 * Accepts only same-origin, absolute paths so a login link cannot redirect elsewhere. Anything
 * else, including protocol-relative `//host` and backslash tricks, returns the catalog.
 */
export function toSafeReturnPath(candidate: string | null | undefined): string {
  if (!candidate?.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return DefaultReturnPath;
  }
  try {
    const url = new URL(candidate, "https://portal.invalid");
    if (url.origin !== "https://portal.invalid" || url.pathname.startsWith("/login")) {
      return DefaultReturnPath;
    }
    return url.pathname + url.search;
  } catch {
    return DefaultReturnPath;
  }
}
