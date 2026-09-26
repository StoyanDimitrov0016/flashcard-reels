import type { Route } from "next";

/**
 * Typed routes validate literal hrefs. Use this only for paths assembled at runtime from a
 * known-valid route, such as the current pathname with a new query or a sanitized return path.
 */
export function runtimeRoute(path: string): Route {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see the function comment
  return path as Route;
}
