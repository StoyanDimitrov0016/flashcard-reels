"use client";

import type { ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";

import { getQueryClient } from "@/lib/query-client";

type ProvidersProps = Readonly<{ children: ReactNode }>;

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
