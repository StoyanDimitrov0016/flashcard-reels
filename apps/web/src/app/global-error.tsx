"use client";

import "./globals.css";
import { ErrorPanel } from "@/components/error-panel";

type GlobalErrorProps = Readonly<{
  error: Error & { digest?: string };
  retry: () => void;
}>;

// Replaces the root layout when it fails, so it renders its own document.
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <ErrorPanel
          description="Flashcard Reels could not start. Try again in a moment."
          digest={error.digest}
          onRetry={retry}
          title="Something went wrong"
        />
      </body>
    </html>
  );
}
