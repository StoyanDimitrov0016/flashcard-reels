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
          aria-label="Back to decks"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          href="/"
          title="Back to decks"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="mt-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{deck.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              {deck.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Download deck"
              asChild
              className="size-10 p-0"
              title="Download deck"
              variant="outline"
            >
              <a href={"/api/decks/" + deck.id + "/download"}>
                <Download className="size-4" />
              </a>
            </Button>
            <DeckTransferCard deckId={deck.id} />
          </div>
        </div>
        <FlashcardBrowser deck={deck} />
      </section>
    </main>
  );
}
