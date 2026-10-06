import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

import { createQueryClient } from "@/shared/presentation/query/query-client";

type QueryWrapperProps = Readonly<{ children: ReactNode }>;

/** A fresh client per test, with the app's query defaults, for rendering data hooks. */
export function createQueryWrapper() {
  const client = createQueryClient();
  return function QueryWrapper({ children }: QueryWrapperProps) {
    return createElement(QueryClientProvider, { client }, children);
  };
}
