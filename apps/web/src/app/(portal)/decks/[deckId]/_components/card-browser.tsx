"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Repeat2,
  Search,
  Space,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";

import type { DeckCard } from "@/server/decks";

import { FlashcardText } from "@/components/flashcard-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { runtimeRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { PhoneCard } from "./phone-card";

function matches(card: DeckCard, query: string): boolean {
  return `${card.question} ${card.answer}`.toLowerCase().includes(query);
}

type CardBrowserProps = Readonly<{
  cards: readonly DeckCard[];
  /** Deck actions and facts; on wide screens they sit above the phone. */
  details: ReactNode;
  header: ReactNode;
  sectionNav?: ReactNode;
}>;

/**
 * Browse a deck's cards like the app does: one card at a time, answer hidden until revealed.
 * The selected card and search live in the URL, so a card can be linked directly.
 */
export function CardBrowser({ cards, details, header, sectionNav }: CardBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [selectedId, setSelectedId] = useState(() => searchParams.get("card"));
  const [revealed, setRevealed] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCards = normalizedQuery
    ? cards.filter((card) => matches(card, normalizedQuery))
    : cards;
  const selectedIndex = Math.max(
    0,
    visibleCards.findIndex((card) => card.id === selectedId)
  );
  const card = visibleCards[selectedIndex];

  const syncUrl = (next: Readonly<{ card?: string | null; q?: string }>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.replace(runtimeRoute(`${pathname}?${params.toString()}`), { scroll: false });
  };
  const syncQueryLater = useDebouncedCallback((value: string) => syncUrl({ q: value.trim() }), 250);

  const select = (index: number) => {
    const next = visibleCards[index];
    if (next) {
      setSelectedId(next.id);
      setRevealed(false);
      syncUrl({ card: next.id });
      document.getElementById(`card-${next.id}`)?.scrollIntoView({ block: "nearest" });
      viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  useHotkeys({
    " ": () => setRevealed((value) => !value),
    "/": () => searchRef.current?.focus(),
    ArrowLeft: () => select(selectedIndex - 1),
    ArrowRight: () => select(selectedIndex + 1),
    Enter: () => setRevealed((value) => !value),
  });

  return (
    // Small screens stack header, details, sections, phone, and list. Wide screens keep the header,
    // sections, and list on the left and pin the details and phone on the right. The right column
    // uses `contents` on small screens so its children join the stacking order.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_auto_1fr] lg:gap-x-12">
      <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">{header}</div>
      <div className="contents lg:sticky lg:top-20 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-5 lg:self-start">
        <div className="order-2">{details}</div>
        <section aria-label="Card viewer" className="order-4 min-w-0 scroll-mt-20" ref={viewerRef}>
          {card ? (
            <div className="flex flex-col items-center gap-5">
              <PhoneCard
                card={card}
                key={card.id}
                onFlip={() => setRevealed((value) => !value)}
                position={selectedIndex + 1}
                revealed={revealed}
                total={visibleCards.length}
              />
              <div className="flex items-center gap-3">
                <Button
                  aria-label="Previous card"
                  disabled={selectedIndex === 0}
                  onClick={() => select(selectedIndex - 1)}
                  size="icon"
                  variant="outline"
                >
                  <ChevronLeft />
                </Button>
                <Button className="w-40" onClick={() => setRevealed((value) => !value)}>
                  <Repeat2 />
                  {revealed ? "Show question" : "Show answer"}
                </Button>
                <Button
                  aria-label="Next card"
                  disabled={selectedIndex >= visibleCards.length - 1}
                  onClick={() => select(selectedIndex + 1)}
                  size="icon"
                  variant="outline"
                >
                  <ChevronRight />
                </Button>
              </div>
              <p className="hidden items-center gap-1.5 text-xs text-subtle-foreground md:flex">
                <KbdGroup>
                  <Kbd aria-label="Left arrow">
                    <ArrowLeft aria-hidden />
                  </Kbd>
                  <Kbd aria-label="Right arrow">
                    <ArrowRight aria-hidden />
                  </Kbd>
                </KbdGroup>
                move
                <Kbd aria-label="Space" className="ml-3">
                  <Space aria-hidden />
                </Kbd>
                flip
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-input px-6 py-16 text-center text-sm text-muted-foreground">
              No cards match &quot;{query.trim()}&quot;.
            </div>
          )}
        </section>
      </div>
      {sectionNav && (
        <div className="order-3 min-w-0 lg:col-start-1 lg:row-start-2">{sectionNav}</div>
      )}
      <aside aria-label="Cards" className="order-5 min-w-0 lg:col-start-1 lg:row-start-3">
        <search className="relative block">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
          />
          <Input
            aria-label="Search cards"
            className="px-9 [&::-webkit-search-cancel-button]:hidden"
            onChange={(event) => {
              setQuery(event.target.value);
              setRevealed(false);
              syncQueryLater(event.target.value);
            }}
            placeholder="Search cards"
            ref={searchRef}
            type="search"
            value={query}
          />
          {query && (
            <Button
              aria-label="Clear card search"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => {
                setQuery("");
                syncUrl({ q: "" });
              }}
              size="icon-xs"
              variant="ghost"
            >
              <X />
            </Button>
          )}
        </search>
        <p className="mt-3 px-1 text-xs text-subtle-foreground">
          {normalizedQuery
            ? `${visibleCards.length} of ${cards.length} cards`
            : `${cards.length} cards`}
        </p>
        <ol className="mt-2">
          {visibleCards.map((item, index) => (
            <li key={item.id}>
              <button
                aria-current={index === selectedIndex ? "true" : undefined}
                className={cn(
                  "flex w-full gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                id={`card-${item.id}`}
                onClick={() => select(index)}
                type="button"
              >
                <span className="w-6 shrink-0 pt-px text-right text-xs text-subtle-foreground tabular-nums">
                  {item.order + 1}
                </span>
                <span className="line-clamp-2">
                  <FlashcardText text={item.question} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
