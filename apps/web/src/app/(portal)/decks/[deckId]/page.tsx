import type { Metadata, Route } from "next";
import type { ReactNode } from "react";

import { BookOpen, ChevronRight, Download, Layers, Smartphone, Volume2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { SendToPhoneDialog } from "@/components/send-to-phone-dialog";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getDeckLibrary } from "@/server/decks";

import { CardBrowser } from "./_components/card-browser";
import { LessonsView } from "./_components/lessons-view";

type SectionTabProps<T extends string> = Readonly<{
  active: boolean;
  children: ReactNode;
  href: Route<T>;
}>;

function SectionTab<T extends string>({ active, children, href }: SectionTabProps<T>) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
      href={href}
      scroll={false}
    >
      {children}
    </Link>
  );
}

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

  const intro = (
    <>
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-subtle-foreground"
      >
        <Link className="rounded hover:text-foreground" href="/">
          Decks
        </Link>
        <ChevronRight aria-hidden className="size-3.5" />
        <span aria-current="page" className="truncate text-muted-foreground">
          {deck.title}
        </span>
      </nav>

      <header className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{deck.title}</h1>
          <p className="mt-1.5 max-w-2xl leading-6 text-muted-foreground">{deck.description}</p>
          {/* One line of details instead of a row of badges keeps the card viewer near the top. */}
          <ul className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-subtle-foreground [&_svg]:size-3.5">
            <li className="flex items-center gap-1">
              <Layers aria-hidden />
              {pluralize(deck.cardCount, "card")}
            </li>
            {deck.lessonCount > 0 && (
              <li className="flex items-center gap-1">
                <BookOpen aria-hidden />
                {pluralize(deck.lessonCount, "lesson")}
              </li>
            )}
            {deck.audioCount > 0 && (
              <li className="flex items-center gap-1">
                <Volume2 aria-hidden />
                Audio
              </li>
            )}
            <li>{formatBytes(deck.sizeBytes)}</li>
            <li>
              Version {deck.version} · Updated {formatDate(deck.updatedAt)}
            </li>
          </ul>
        </div>
        <div className="flex shrink-0 gap-2">
          <SendToPhoneDialog deckId={deck.id} deckTitle={deck.title}>
            <Button>
              <Smartphone />
              Send to phone
            </Button>
          </SendToPhoneDialog>
          <Button
            nativeButton={false}
            render={<a download href={`/decks/${deck.id}/download`} />}
            variant="outline"
          >
            <Download />
            Download
          </Button>
        </div>
      </header>

      {deck.lessons.length > 0 && (
        <nav aria-label="Deck sections" className="mt-6 flex gap-6 border-b border-border">
          <SectionTab active={!showLessons} href={`/decks/${deck.id}`}>
            Cards
          </SectionTab>
          <SectionTab active={showLessons} href={`/decks/${deck.id}?view=lessons`}>
            Lessons
          </SectionTab>
        </nav>
      )}
    </>
  );

  return (
    <PageContainer className="sm:py-6">
      {showLessons ? (
        <>
          {intro}
          <div className="mt-6">
            <LessonsView deckId={deck.id} lessons={deck.lessons} selectedLessonId={lesson} />
          </div>
        </>
      ) : (
        <CardBrowser cards={deck.cards} intro={intro} key={deck.id} />
      )}
    </PageContainer>
  );
}

export async function generateMetadata({ params }: DeckPageProps): Promise<Metadata> {
  const { deckId } = await params;
  const deck = await getDeckLibrary().findDeck(deckId);
  return { title: deck?.title ?? "Deck not found" };
}
