import { BookOpen, Download, Layers, Smartphone, Volume2 } from "lucide-react";
import Link from "next/link";

import type { DeckSummary } from "@/server/decks";

import { DeckMonogram } from "@/components/deck-monogram";
import { SendToPhoneDialog } from "@/components/send-to-phone-dialog";
import { Button } from "@/components/ui/button";
import { formatBytes, pluralize } from "@/lib/format";

type DeckCardProps = Readonly<{ deck: DeckSummary }>;

export function DeckCard({ deck }: DeckCardProps) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-[border-color,box-shadow] hover:border-input hover:shadow-md">
      <div className="flex items-start gap-3">
        <DeckMonogram title={deck.title} />
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-tight">
            {/* The stretched link lets the whole card open the deck. */}
            <Link
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
              href={`/decks/${deck.id}`}
            >
              {deck.title}
            </Link>
          </h2>
          <p className="mt-0.5 text-xs text-subtle-foreground">
            Version {deck.version} · {formatBytes(deck.sizeBytes)}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {deck.description}
      </p>
      {/* The negative margins cancel the icon buttons' inner space, so the icons line up with the text. */}
      <div className="-mr-2 -mb-2 mt-auto flex items-center justify-between gap-3 pt-4">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-subtle-foreground [&_svg]:size-3.5">
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
        </ul>
        <div className="relative z-10 flex items-center gap-0.5">
          <SendToPhoneDialog deckId={deck.id} deckTitle={deck.title}>
            <Button
              aria-label={`Send ${deck.title} to phone`}
              size="icon"
              title="Send to phone"
              variant="ghost"
            >
              <Smartphone />
            </Button>
          </SendToPhoneDialog>
          <Button
            size="icon"
            variant="ghost"
            nativeButton={false}
            render={
              <a
                aria-label={`Download ${deck.title}`}
                download
                href={`/decks/${deck.id}/download`}
                title="Download .fcrdeck"
              />
            }
          >
            <Download />
          </Button>
        </div>
      </div>
    </article>
  );
}
