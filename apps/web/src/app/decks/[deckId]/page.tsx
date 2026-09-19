import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DeckTransferCard } from "@/components/deck-transfer-card";
import { FlashcardBrowser } from "@/components/flashcard-browser";
import { Button } from "@/components/ui/button";
import { readDeckPackage } from "@/lib/deck-package";

type DeckPageProps = Readonly<{ params: Promise<{ deckId: string }> }>;

export default async function DeckPage({ params }: DeckPageProps) {
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
      <section className="mx-auto max-w-[1500px] px-6 pb-16 pt-8 lg:px-10">
        <div className="flex items-start gap-4 sm:gap-6">
          <Link
            aria-label="Back to decks"
            className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive)]"
            href="/"
            title="Back to decks"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{deck.title}</h1>
              <p className="mt-3 max-w-4xl text-base leading-7 text-[var(--text-secondary)]">
                {deck.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
        </div>
        <FlashcardBrowser deck={deck} />
      </section>
    </main>
  );
}
