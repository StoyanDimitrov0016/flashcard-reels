import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import type { DeckLesson } from "@/server/decks";

import { Button } from "@/components/ui/button";

type LessonPagerProps = Readonly<{
  deckId: string;
  next: DeckLesson | undefined;
  previous: DeckLesson | undefined;
}>;

/** Links to the neighboring lessons; the first lesson has no Previous and the last no Next. */
export function LessonPager({ deckId, next, previous }: LessonPagerProps) {
  if (!previous && !next) {
    return null;
  }
  return (
    <nav aria-label="Lesson navigation" className="mt-12 border-t border-border pt-6">
      <ul className="grid grid-cols-2 gap-3">
        {previous && (
          <li className="col-start-1 min-w-0">
            <Button
              className="h-auto w-full justify-start gap-3 py-3"
              nativeButton={false}
              render={<Link href={`/decks/${deckId}?view=lessons&lesson=${previous.id}`} />}
              variant="outline"
            >
              <ArrowLeft aria-hidden />
              <span className="flex min-w-0 flex-col items-start">
                <span className="text-xs text-muted-foreground">Previous</span>
                <span className="w-full truncate text-left">{previous.title}</span>
              </span>
            </Button>
          </li>
        )}
        {next && (
          <li className="col-start-2 min-w-0">
            <Button
              className="h-auto w-full justify-end gap-3 py-3"
              nativeButton={false}
              render={<Link href={`/decks/${deckId}?view=lessons&lesson=${next.id}`} />}
              variant="outline"
            >
              <span className="flex min-w-0 flex-col items-end">
                <span className="text-xs text-muted-foreground">Next</span>
                <span className="w-full truncate text-right">{next.title}</span>
              </span>
              <ArrowRight aria-hidden />
            </Button>
          </li>
        )}
      </ul>
    </nav>
  );
}
