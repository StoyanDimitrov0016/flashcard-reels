"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpen, Download, LoaderCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { DeckSearchForm } from "@/components/deck-search-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deckCatalogQueryOptions, downloadDeckMutationOptions } from "@/lib/deck-queries";

function DeckGridSkeleton() {
  return (
    <div
      aria-label="Loading deck library"
      className="grid max-w-6xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5"
          key={index}
        >
          <div className="mb-8 flex justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <div className="mt-8 flex justify-between border-t border-[var(--border-subtle)] pt-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DeckCatalog() {
  const query = useQuery(deckCatalogQueryOptions);
  const downloadMutation = useMutation(downloadDeckMutationOptions);
  const [search, setSearch] = useState("");
  const onSearch = useCallback((value: string) => setSearch(value.toLowerCase()), []);
  const decks = query.data?.filter((deck) => deck.title.toLowerCase().includes(search)) ?? [];

  if (query.isPending) {
    return (
      <>
        <AppHeader />
        <section className="mx-auto max-w-6xl px-6 pb-10 pt-12 sm:pt-16">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-14 max-w-xl" />
          <Skeleton className="mt-5 h-6 max-w-2xl" />
          <Skeleton className="mt-6 h-11 max-w-xl" />
        </section>
        <DeckGridSkeleton />
      </>
    );
  }
  if (query.isError) {
    return (
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex flex-col items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-6 py-12 text-center">
          <AlertCircle className="size-6 text-[var(--error)]" />
          <h2 className="mt-4 text-lg font-semibold">Library unavailable</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            {query.error.message}
          </p>
          <Button className="mt-6" onClick={() => query.refetch()} variant="outline">
            <RefreshCw data-icon="inline-start" className="size-4" />
            Try again
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <AppHeader />
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-12 sm:pt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--interactive)]">
          Deck library
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Learn in motion.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
          Browse every generated deck, inspect its cards, and send a private download to your phone.
        </p>
        <DeckSearchForm onSearch={onSearch} />
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-sm">
          <BookOpen className="size-5 text-[var(--interactive)]" />
          <span>
            <strong>{decks.length}</strong> {search ? "matching" : "published"} decks
          </span>
        </div>
        {decks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
            No decks match this search.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <article
                className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-sm transition-shadow hover:shadow-md"
                key={deck.id}
              >
                <div>
                  <div className="mb-8 flex items-start justify-between gap-4">
                    <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      v1 � R2
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">{deck.size}</span>
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">{deck.title}</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {deck.cards} cards � {deck.audio} answer recordings
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
                  <span className="text-xs text-[var(--text-tertiary)]">Schema v1</span>
                  <div className="flex items-center gap-2">
                    <Button asChild size="default" variant="outline">
                      <Link href={"/decks/" + deck.id}>Browse cards</Link>
                    </Button>
                    <Button
                      disabled={downloadMutation.isPending}
                      onClick={() =>
                        downloadMutation.mutate(deck.id, {
                          onSuccess: ({ url }) => window.location.assign(url),
                        })
                      }
                      size="default"
                      variant="outline"
                    >
                      {downloadMutation.isPending && downloadMutation.variables === deck.id ? (
                        <LoaderCircle data-icon="inline-start" className="size-4 animate-spin" />
                      ) : (
                        <Download data-icon="inline-start" className="size-4" />
                      )}
                      {downloadMutation.isPending && downloadMutation.variables === deck.id
                        ? "Preparing..."
                        : "Download"}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {downloadMutation.isError ? (
          <p className="mt-4 text-sm text-[var(--error)]" role="alert">
            {downloadMutation.error.message}
          </p>
        ) : null}
      </section>
    </>
  );
}
