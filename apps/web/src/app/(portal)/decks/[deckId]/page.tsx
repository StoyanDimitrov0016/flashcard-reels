import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getDeckLibrary } from "@/server/decks";

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
  const showLessons = view === "lessons" && deck.lessons.length > 0;

  const header = <DeckHeader deck={deck} />;
  const details = (
    <section aria-label="Deck package" className="flex flex-col gap-3">
      <DeckActions deck={deck} />
      <DeckFacts className="text-xs lg:justify-center" deck={deck} />
    </section>
  );
  const sectionNav =
    deck.lessons.length > 0 ? (
      <DeckSectionNav active={showLessons ? "lessons" : "cards"} deckId={deck.id} />
    ) : undefined;

  return (
    <PageContainer className="py-4 sm:py-5">
      {showLessons ? (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10">
            {header}
            <div className="md:w-80 md:shrink-0">{details}</div>
          </div>
          <div className="mt-5">{sectionNav}</div>
          <div className="mt-6">
            <LessonsView deckId={deck.id} lessons={deck.lessons} selectedLessonId={lesson} />
          </div>
        </>
      ) : (
        <CardBrowser
          cards={deck.cards}
          details={details}
          header={header}
          key={deck.id}
          sectionNav={sectionNav}
        />
      )}
    </PageContainer>
  );
}

export async function generateMetadata({ params }: DeckPageProps): Promise<Metadata> {
  const { deckId } = await params;
  const deck = await getDeckLibrary().findDeck(deckId);
  return { title: deck?.title ?? "Deck not found" };
}
