import type { Metadata } from "next";

import { Library, SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import { getDeckLibrary } from "@/server/decks";

import { CatalogSearch } from "./_components/catalog-search";
import { DeckCard } from "./_components/deck-card";

export const metadata: Metadata = { title: "Decks" };

type CatalogPageProps = Readonly<{ searchParams: Promise<{ q?: string }> }>;

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { q = "" } = await searchParams;
  const decks = await getDeckLibrary().listDecks();
  const query = q.trim().toLowerCase();
  const visibleDecks = query
    ? decks.filter((deck) => `${deck.title} ${deck.description}`.toLowerCase().includes(query))
    : decks;

  return (
    <PageContainer>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Decks</h1>
        <p className="text-fg-muted">Curated decks, ready to send to the Flashcard Reels app.</p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CatalogSearch />
        <p aria-live="polite" className="text-sm text-fg-subtle">
          {query
            ? `${visibleDecks.length} of ${pluralize(decks.length, "deck")}`
            : pluralize(decks.length, "deck")}
        </p>
      </div>

      <div className="mt-6">
        {decks.length === 0 && (
          <EmptyState
            description="Publish a deck package to storage and it will appear here."
            icon={Library}
            title="No decks published yet"
          />
        )}
        {decks.length > 0 && visibleDecks.length === 0 && (
          <EmptyState
            action={
              <Button asChild size="sm">
                <Link href="/">Clear search</Link>
              </Button>
            }
            description={`Nothing matches "${q.trim()}". Try a topic such as caching or React.`}
            icon={SearchX}
            title="No matching decks"
          />
        )}
        {visibleDecks.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDecks.map((deck) => (
              <DeckCard deck={deck} key={deck.id} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
