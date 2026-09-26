import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { lightColors, darkColors } from "@flashcard-reels/design-tokens";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  description: "Browse curated Flashcard Reels decks and send them to the app.",
  icons: { apple: "/app-logo.png", icon: "/app-logo.png" },
  // An internal portal behind a shared password; keep it out of search results.
  robots: { follow: false, index: false },
  title: { default: "Flashcard Reels", template: "%s · Flashcard Reels" },
};

export const viewport: Viewport = {
  themeColor: [
    { color: lightColors.canvas, media: "(prefers-color-scheme: light)" },
    { color: darkColors.canvas, media: "(prefers-color-scheme: dark)" },
  ],
};

type RootLayoutProps = Readonly<{ children: ReactNode }>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
