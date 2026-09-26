"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type ErrorPanelProps = Readonly<{
  title: string;
  description: string;
  digest?: string;
  onRetry: () => void;
}>;

export function ErrorPanel({ title, description, digest, onRetry }: ErrorPanelProps) {
  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center"
      role="alert"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-subtle text-danger">
        <AlertTriangle aria-hidden className="size-5" />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-fg-muted">{description}</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={onRetry} variant="primary">
          <RefreshCw />
          Try again
        </Button>
        <Button asChild>
          <Link href="/">Back to decks</Link>
        </Button>
      </div>
      {digest && <p className="mt-6 font-mono text-xs text-fg-subtle">Reference {digest}</p>}
    </div>
  );
}
