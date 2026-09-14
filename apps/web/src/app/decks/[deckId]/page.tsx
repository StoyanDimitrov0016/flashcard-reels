import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DeckTransferCard } from "@/components/deck-transfer-card";
import { FlashcardBrowser } from "@/components/flashcard-browser";
import { Button } from "@/components/ui/button";
import { readDeckPackage } from "@/lib/deck-package";

export default async function DeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const routeParams = await params;
  let deck;
  try {
    deck = await readDeckPackage(routeParams.deckId);
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <AppHeader />
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-10 sm:pt-14">
        <Link
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          href="/"
        >
          <ArrowLeft className="size-4" />
          Back to library
        </Link>
        <div className="mt-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--interactive)]">
              Flashcard browser
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{deck.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              {deck.description}
            </p>
          </div>
          <Button asChild variant="outline">
            <a href={"/api/decks/" + deck.id + "/download"}>
              <Download data-icon="inline-start" className="size-4" />
              Download deck
            </a>
          </Button>
        </div>
        <DeckTransferCard deckId={deck.id} />
        <FlashcardBrowser deck={deck} />
      </section>
    </main>
  );
}
