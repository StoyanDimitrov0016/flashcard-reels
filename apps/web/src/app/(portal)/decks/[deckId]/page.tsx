import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { type DeckSummary, getDeckLibrary } from "@/server/decks";

import { CardBrowser } from "./_components/card-browser";
import { DeckActions } from "./_components/deck-actions";
import { DeckFacts } from "./_components/deck-facts";
import { DeckHeader } from "./_components/deck-header";
import { DeckSectionNav } from "./_components/deck-section-nav";
import { LessonsView } from "./_components/lessons-view";

type DeckPageProps = Readonly<{
  params: Promise<{ deckId: string }>;
  searchParams: Promise<{ view?: string; lesson?: string }>;
}>;

export default async function DeckPage({ params, searchParams }: DeckPageProps) {
  const [{ deckId }, { view, lesson }] = await Promise.all([params, searchParams]);
  const deck = await getDeckLibrary().getDeckContent(deckId);
  if (!deck) {
    notFound();
  }
  const hasLessons = deck.lessons.length > 0;
  const showLessons = view === "lessons" && hasLessons;

  return (
    <PageContainer className="py-4 sm:py-5">
      {showLessons ? (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10">
            <DeckHeader deck={deck} />
            <div className="md:w-80 md:shrink-0">
              <DeckDetails deck={deck} />
            </div>
          </div>
          <div className="mt-5">
            <DeckSectionNav active="lessons" deckId={deck.id} />
          </div>
          <div className="mt-6">
            <LessonsView
              deckId={deck.id}
              lessons={deck.lessons}
              selectedLessonId={lesson ?? null}
            />
          </div>
        </>
      ) : (
        <CardBrowser
          cards={deck.cards}
          details={<DeckDetails deck={deck} />}
          header={<DeckHeader deck={deck} />}
          key={deck.id}
          sectionNav={hasLessons ? <DeckSectionNav active="cards" deckId={deck.id} /> : undefined}
        />
      )}
    </PageContainer>
  );
}

type DeckDetailsProps = Readonly<{ deck: DeckSummary }>;

function DeckDetails({ deck }: DeckDetailsProps) {
  return (
    <section aria-label="Deck package" className="flex flex-col gap-3">
      <DeckActions deck={deck} />
      <DeckFacts className="text-xs lg:justify-center" deck={deck} />
    </section>
  );
}

export async function generateMetadata({ params }: DeckPageProps): Promise<Metadata> {
  const { deckId } = await params;
  const deck = await getDeckLibrary().findDeck(deckId);
  return { title: deck?.title ?? "Deck not found" };
}
