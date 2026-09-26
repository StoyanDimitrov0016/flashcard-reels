import { environmentManager, QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 60_000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * The server gets a fresh client per request so users never share cache. The browser keeps one
 * client, which also survives React suspending during the first render.
 */
export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
