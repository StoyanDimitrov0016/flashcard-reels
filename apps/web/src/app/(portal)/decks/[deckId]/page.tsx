import type { Metadata, Route } from "next";
import type { ReactNode } from "react";

import { BookOpen, ChevronRight, Download, Layers, Volume2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { SendToPhoneDialog } from "@/components/send-to-phone-dialog";
import { Badge } from "@/components/ui/badge";
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
        active ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg"
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

  return (
    <PageContainer className="sm:py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-fg-subtle">
        <Link className="rounded hover:text-fg" href="/">
          Decks
        </Link>
        <ChevronRight aria-hidden className="size-3.5" />
        <span aria-current="page" className="truncate text-fg-muted">
          {deck.title}
        </span>
      </nav>

      <header className="mt-5 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{deck.title}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-fg-muted">{deck.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge>
              <Layers aria-hidden />
              {pluralize(deck.cardCount, "card")}
            </Badge>
            {deck.lessonCount > 0 && (
              <Badge>
                <BookOpen aria-hidden />
                {pluralize(deck.lessonCount, "lesson")}
              </Badge>
            )}
            {deck.audioCount > 0 && (
              <Badge>
                <Volume2 aria-hidden />
                {pluralize(deck.audioCount, "audio clip")}
              </Badge>
            )}
            <Badge>{formatBytes(deck.sizeBytes)}</Badge>
            <Badge>
              Version {deck.version} · Updated {formatDate(deck.updatedAt)}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <SendToPhoneDialog deckId={deck.id} deckTitle={deck.title} />
          <Button asChild>
            <a download href={`/decks/${deck.id}/download`}>
              <Download />
              Download
            </a>
          </Button>
        </div>
      </header>

      {deck.lessons.length > 0 && (
        <nav aria-label="Deck sections" className="mt-8 flex gap-6 border-b border-line">
          <SectionTab active={!showLessons} href={`/decks/${deck.id}`}>
            Cards
          </SectionTab>
          <SectionTab active={showLessons} href={`/decks/${deck.id}?view=lessons`}>
            Lessons
          </SectionTab>
        </nav>
      )}

      <div className={deck.lessons.length > 0 ? "mt-6" : "mt-10"}>
        {showLessons ? (
          <LessonsView deckId={deck.id} lessons={deck.lessons} selectedLessonId={lesson} />
        ) : (
          <CardBrowser cards={deck.cards} key={deck.id} />
        )}
      </div>
    </PageContainer>
  );
}

export async function generateMetadata({ params }: DeckPageProps): Promise<Metadata> {
  const { deckId } = await params;
  const deck = await getDeckLibrary().findDeck(deckId);
  return { title: deck?.title ?? "Deck not found" };
}
