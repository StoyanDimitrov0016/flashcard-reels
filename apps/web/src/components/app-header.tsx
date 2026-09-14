import { LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--navigation)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--action-primary)] text-[var(--action-primary-text)]">
            <Sparkles className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">Flashcard Reels</span>
        </Link>
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span className="hidden items-center gap-2 sm:flex">
            <LockKeyhole className="size-4" />
            Internal library
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
