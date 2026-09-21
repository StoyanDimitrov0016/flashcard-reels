"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import * as z from "zod";

import type { DeckPackage } from "@/lib/deck-package";

import { Button } from "@/components/ui/button";

const FlashcardSearchSchema = z.compile(
  z.object({ query: z.string().trim().max(80, "Search is limited to 80 characters.") })
);
type FlashcardSearchValues = z.infer<typeof FlashcardSearchSchema>;

const submitFlashcardSearch: SubmitHandler<FlashcardSearchValues> = () => undefined;

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(
    function updateDebouncedValue() {
      const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay);
      return function clearDebounceTimeout() {
        window.clearTimeout(timeoutId);
      };
    },
    [delay, value]
  );
  return debouncedValue;
}

type FlashcardBrowserProps = Readonly<{ deck: DeckPackage }>;

export function FlashcardBrowser({ deck }: FlashcardBrowserProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<FlashcardSearchValues>({
    defaultValues: { query: "" },
    mode: "onChange",
    resolver: zodResolver(FlashcardSearchSchema),
  });
  const query = useWatch({ control, name: "query" }) ?? "";
  const debouncedQuery = useDebouncedValue(query, 250).toLowerCase();
  const filteredCards = deck.cards.filter((card) =>
    (card.question + " " + card.answer).toLowerCase().includes(debouncedQuery)
  );
  const activeIndex = Math.min(cardIndex, Math.max(filteredCards.length - 1, 0));
  const card = filteredCards[activeIndex];

  const goToCard = (nextIndex: number) => {
    setCardIndex(nextIndex);
    setIsFlipped(false);
  };

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:border-r lg:border-[var(--border-subtle)] lg:pr-5">
        <form
          className="sticky top-0 z-10 bg-[var(--canvas)] pb-3"
          onSubmit={handleSubmit(submitFlashcardSearch)}
        >
          <label className="sr-only" htmlFor="flashcard-search">
            Search flashcards
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--interactive)]">
            <Search className="size-4 shrink-0 text-[var(--text-tertiary)]" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
              id="flashcard-search"
              placeholder="Search cards"
              {...register("query")}
            />
            {query.length > 0 && (
              <Button
                aria-label="Clear flashcard search"
                className="size-7 shrink-0 p-0"
                onClick={() => reset()}
                size="default"
                title="Clear search"
                type="button"
                variant="outline"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
          {errors.query !== undefined && (
            <p className="mt-2 text-xs text-[var(--error)]">{errors.query.message}</p>
          )}
        </form>
        <div className="mt-4 space-y-1">
          {filteredCards.map((item, index) => (
            <button
              aria-current={index === activeIndex}
              className={
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors " +
                (index === activeIndex
                  ? "bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]")
              }
              key={item.id}
              onClick={() => goToCard(index)}
              type="button"
            >
              <span className="mr-2 text-xs text-[var(--text-tertiary)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="line-clamp-2">{item.question}</span>
            </button>
          ))}
        </div>
      </aside>
      <section aria-label="Flashcard carousel" aria-roledescription="carousel" className="min-w-0">
        {!card ? (
          <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
            No cards match this search.
          </p>
        ) : (
          <>
            <div className="mb-4 flex items-center text-sm text-[var(--text-secondary)]">
              <span>
                {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(filteredCards.length).padStart(2, "0")}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--interactive)] transition-[width]"
                style={{ width: ((activeIndex + 1) / filteredCards.length) * 100 + "%" }}
              />
            </div>
            <div className="mt-6 [perspective:1200px]">
              <div
                className="relative min-h-[clamp(28rem,58vh,42rem)] w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
                style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                <article
                  aria-label="Flashcard front"
                  className="absolute inset-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-7 shadow-sm [backface-visibility:hidden] sm:p-10"
                >
                  <div className="flex h-full flex-col justify-between">
                    <h2 className="max-w-2xl text-2xl font-semibold leading-tight sm:text-4xl">
                      {card.question}
                    </h2>
                    <Button
                      aria-label="Reveal answer"
                      className="size-10 self-start p-0"
                      onClick={() => setIsFlipped(true)}
                      title="Reveal answer"
                      variant="outline"
                    >
                      <Eye className="size-4" />
                    </Button>
                  </div>
                </article>
                <article
                  aria-label="Flashcard answer"
                  className="absolute inset-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-7 shadow-sm [backface-visibility:hidden] sm:p-10"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  <div className="flex h-full flex-col justify-between">
                    <p className="whitespace-pre-wrap text-lg leading-8 text-[var(--text-secondary)] sm:text-2xl">
                      {card.answer}
                    </p>
                    <Button
                      aria-label="Hide answer"
                      className="size-10 self-start p-0"
                      onClick={() => setIsFlipped(false)}
                      title="Hide answer"
                      variant="outline"
                    >
                      <EyeOff className="size-4" />
                    </Button>
                  </div>
                </article>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Button
                aria-label="Previous card"
                className="size-10 p-0"
                disabled={activeIndex === 0}
                onClick={() => goToCard(activeIndex - 1)}
                title="Previous card"
                variant="outline"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <Button
                aria-label="Next card"
                className="size-10 p-0"
                disabled={activeIndex === filteredCards.length - 1}
                onClick={() => goToCard(activeIndex + 1)}
                title="Next card"
              >
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
