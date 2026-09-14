"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import type { DeckPackage } from "@/lib/deck-package";

export const FlashcardSearchSchema = z.compile(
  z.object({ query: z.string().trim().max(80, "Search is limited to 80 characters.") })
);
type FlashcardSearchValues = z.infer<typeof FlashcardSearchSchema>;

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

const submitFlashcardSearch: SubmitHandler<FlashcardSearchValues> = () => undefined;

export function FlashcardBrowser({ deck }: Readonly<{ deck: DeckPackage }>) {
  const [cardIndex, setCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
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
  const filteredCards = deck.cards.filter((card) => {
    const haystack = (card.question + " " + card.answer).toLowerCase();
    return haystack.includes(debouncedQuery);
  });
  const activeIndex = Math.min(cardIndex, Math.max(filteredCards.length - 1, 0));
  const card = filteredCards[activeIndex];
  const cardNumber = activeIndex + 1;

  if (!card) {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
        No flashcards match this search.
      </p>
    );
  }

  const goToCard = (nextIndex: number) => {
    setCardIndex(nextIndex);
    setShowAnswer(false);
  };

  return (
    <div className="mt-8">
      <form className="mb-6" onSubmit={handleSubmit(submitFlashcardSearch)}>
        <label className="sr-only" htmlFor="flashcard-search">
          Search flashcards
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--interactive)]">
          <Search className="size-4 shrink-0 text-[var(--text-tertiary)]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
            id="flashcard-search"
            placeholder="Search questions and answers"
            {...register("query")}
          />
          {query ? (
            <Button
              aria-label="Clear flashcard search"
              className="size-7 px-0"
              onClick={() => reset()}
              size="default"
              type="button"
              variant="outline"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
        {errors.query ? (
          <p className="mt-2 text-xs text-[var(--error)]">{errors.query.message}</p>
        ) : null}
      </form>
      <div className="mb-4 flex items-center justify-between text-sm text-[var(--text-secondary)]">
        <span>
          Card {cardNumber} of {filteredCards.length}
        </span>
        <span>{Math.round((cardNumber / filteredCards.length) * 100)}% through</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--interactive)] transition-[width]"
          style={{ width: (cardNumber / filteredCards.length) * 100 + "%" }}
        />
      </div>
      <article className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--interactive)]">
          Question
        </p>
        <h2 className="mt-4 text-2xl font-semibold leading-tight sm:text-4xl">{card.question}</h2>
        <div className="mt-10 border-t border-[var(--border-subtle)] pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Answer
          </p>
          {showAnswer ? (
            <p className="mt-4 whitespace-pre-wrap text-lg leading-8 text-[var(--text-secondary)]">
              {card.answer}
            </p>
          ) : (
            <p className="mt-4 text-lg text-[var(--text-tertiary)]">
              Reveal the answer when ready.
            </p>
          )}
          <Button
            className="mt-6"
            onClick={() => setShowAnswer((visible) => !visible)}
            variant="outline"
          >
            {showAnswer ? (
              <EyeOff data-icon="inline-start" className="size-4" />
            ) : (
              <Eye data-icon="inline-start" className="size-4" />
            )}
            {showAnswer ? "Hide answer" : "Reveal answer"}
          </Button>
        </div>
      </article>
      <div className="mt-5 flex justify-between gap-3">
        <Button
          disabled={activeIndex === 0}
          onClick={() => goToCard(activeIndex - 1)}
          variant="outline"
        >
          <ArrowLeft data-icon="inline-start" className="size-4" />
          Previous
        </Button>
        <Button
          disabled={activeIndex === filteredCards.length - 1}
          onClick={() => goToCard(activeIndex + 1)}
        >
          <ArrowRight data-icon="inline-end" className="size-4" />
          Next card
        </Button>
      </div>
    </div>
  );
}
