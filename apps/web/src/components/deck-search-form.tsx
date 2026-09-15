"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";

export const DeckSearchSchema = z.compile(
  z.object({ query: z.string().trim().max(80, "Search is limited to 80 characters.") })
);
export type DeckSearchValues = z.infer<typeof DeckSearchSchema>;

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

export function DeckSearchForm({ onSearch }: Readonly<{ onSearch: (query: string) => void }>) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<DeckSearchValues>({
    defaultValues: { query: "" },
    mode: "onChange",
    resolver: zodResolver(DeckSearchSchema),
  });
  const query = useWatch({ control, name: "query" }) ?? "";
  const debouncedQuery = useDebouncedValue(query, 250);
  const submitSearch: SubmitHandler<DeckSearchValues> = (values) => onSearch(values.query);

  useEffect(
    function publishDebouncedSearch() {
      onSearch(debouncedQuery);
    },
    [debouncedQuery, onSearch]
  );

  return (
    <form className="mt-6" onSubmit={handleSubmit(submitSearch)}>
      <label className="sr-only" htmlFor="deck-search">
        Search decks
      </label>
      <div className="flex max-w-xl items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--interactive)]">
        <Search className="size-4 shrink-0 text-[var(--text-tertiary)]" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
          id="deck-search"
          placeholder="Search decks by title"
          {...register("query")}
        />
        {query ? (
          <Button
            aria-label="Clear deck search"
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
  );
}
