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
import { useRef, useState } from "react";

import type { DeckCard } from "@/server/decks";

import { FlashcardText } from "@/components/flashcard-text";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { runtimeRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { PhoneCard } from "./phone-card";

function matches(card: DeckCard, query: string): boolean {
  return `${card.question} ${card.answer}`.toLowerCase().includes(query);
}

type CardBrowserProps = Readonly<{ cards: readonly DeckCard[] }>;

/**
 * Browse a deck's cards like the app does: one card at a time, answer hidden until revealed.
 * The selected card and search live in the URL, so a card can be linked directly.
 */
export function CardBrowser({ cards }: CardBrowserProps) {
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
      <aside className="order-2 lg:order-1">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
          />
          <input
            aria-label="Search cards"
            className="h-9 w-full rounded-md border border-line-strong bg-surface pr-9 pl-9 text-sm outline-none placeholder:text-fg-subtle focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/20 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
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
            <button
              aria-label="Clear card search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-fg-subtle hover:bg-surface-hover hover:text-fg"
              onClick={() => {
                setQuery("");
                syncUrl({ q: "" });
              }}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <p className="mt-3 px-1 text-xs text-fg-subtle">
          {normalizedQuery
            ? `${visibleCards.length} of ${cards.length} cards`
            : `${cards.length} cards`}
        </p>
        <ol className="mt-2 lg:max-h-[calc(100dvh-16rem)] lg:overflow-y-auto lg:pr-1">
          {visibleCards.map((item, index) => (
            <li key={item.id}>
              <button
                aria-current={index === selectedIndex ? "true" : undefined}
                className={cn(
                  "flex w-full gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-surface-subtle text-fg"
                    : "text-fg-muted hover:bg-surface-hover hover:text-fg"
                )}
                id={`card-${item.id}`}
                onClick={() => select(index)}
                type="button"
              >
                <span className="w-6 shrink-0 pt-px text-right text-xs text-fg-subtle tabular-nums">
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

      <section
        aria-label="Card viewer"
        className="order-1 min-w-0 scroll-mt-20 lg:order-2"
        ref={viewerRef}
      >
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
                variant="secondary"
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
                variant="secondary"
              >
                <ChevronRight />
              </Button>
            </div>
            <p className="hidden items-center gap-1.5 text-xs text-fg-subtle md:flex">
              <Kbd aria-label="Left arrow">
                <ArrowLeft aria-hidden className="size-3" />
              </Kbd>
              <Kbd aria-label="Right arrow">
                <ArrowRight aria-hidden className="size-3" />
              </Kbd>
              move
              <Kbd aria-label="Space" className="ml-3">
                <Space aria-hidden className="size-3" />
              </Kbd>
              flip
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-16 text-center text-sm text-fg-muted">
            No cards match &quot;{query.trim()}&quot;.
          </div>
        )}
      </section>
    </div>
  );
}
