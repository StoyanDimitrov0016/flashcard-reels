import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
// oxlint-disable-next-line import/no-unassigned-import -- Next.js requires the root stylesheet side effect.
import "./globals.css";

export const metadata: Metadata = {
  title: "Flashcard Reels",
  description: "Create and distribute downloadable flashcard decks.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
