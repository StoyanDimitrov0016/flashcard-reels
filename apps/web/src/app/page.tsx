import { LockKeyhole, Sparkles } from "lucide-react";
import { DeckCatalog } from "@/components/deck-catalog";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--navigation)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--action-primary)] text-[var(--action-primary-text)]">
              <Sparkles className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">Flashcard Reels</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span className="flex items-center gap-2">
              <LockKeyhole className="size-4" /> Internal library
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-16 sm:pt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--interactive)]">
          Deck library
        </p>
        <div className="mt-4 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Learn in motion.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
              Your generated decks are ready for review and secure download to the mobile app.
            </p>
          </div>
        </div>
      </section>
      <DeckCatalog />
    </main>
  );
}
