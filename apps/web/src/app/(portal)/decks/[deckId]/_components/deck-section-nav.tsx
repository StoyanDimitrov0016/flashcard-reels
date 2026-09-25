import type { Route } from "next";
import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

type SectionLinkProps<T extends string> = Readonly<{
  active: boolean;
  children: ReactNode;
  href: Route<T>;
}>;

function SectionLink<T extends string>({ active, children, href }: SectionLinkProps<T>) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px block border-b-2 pb-2.5 text-sm font-medium transition-colors",
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

type DeckSectionNavProps = Readonly<{ active: "cards" | "lessons"; deckId: string }>;

/**
 * Cards and Lessons are separate URLs rather than client-side tabs, so each view can be linked
 * and rendered on the server.
 */
export function DeckSectionNav({ active, deckId }: DeckSectionNavProps) {
  return (
    <nav aria-label="Deck sections" className="border-b border-border">
      <ul className="flex gap-6">
        <li>
          <SectionLink active={active === "cards"} href={`/decks/${deckId}`}>
            Cards
          </SectionLink>
        </li>
        <li>
          <SectionLink active={active === "lessons"} href={`/decks/${deckId}?view=lessons`}>
            Lessons
          </SectionLink>
        </li>
      </ul>
    </nav>
  );
}
