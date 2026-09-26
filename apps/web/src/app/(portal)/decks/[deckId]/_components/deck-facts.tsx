import { BookOpen, Layers, Volume2 } from "lucide-react";

import type { DeckSummary } from "@/server/decks";

import { formatBytes, formatDate, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

type DeckFactsProps = Readonly<{
  className?: string;
  deck: Pick<
    DeckSummary,
    "audioCount" | "cardCount" | "lessonCount" | "sizeBytes" | "updatedAt" | "version"
  >;
}>;

/** What the deck contains and which package version is published, as one wrapping line. */
export function DeckFacts({ className, deck }: DeckFactsProps) {
  return (
    <ul
      aria-label="Deck details"
      className={cn(
        "flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-subtle-foreground [&_svg]:size-3.5",
        className
      )}
    >
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
        Version {deck.version} · Updated{" "}
        <time dateTime={deck.updatedAt}>{formatDate(deck.updatedAt)}</time>
      </li>
    </ul>
  );
}
