import type { Metadata } from "next";
import type { ReactNode } from "react";
// oxlint-disable-next-line import/no-unassigned-import -- Next.js requires the root stylesheet side effect.\nimport "./globals.css";

export const metadata: Metadata = {
  title: "Flashcard Reels",
  description: "Create and distribute downloadable flashcard decks.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
