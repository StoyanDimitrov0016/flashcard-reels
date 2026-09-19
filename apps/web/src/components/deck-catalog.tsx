"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Download, Eye, LoaderCircle, RefreshCw } from "lucide-react";
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
      className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5"
          key={index}
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mt-8 h-7 w-3/4" />
          <Skeleton className="mt-3 h-12 w-full" />
          <div className="mt-8 flex justify-end gap-2">
            <Skeleton className="size-9" />
            <Skeleton className="size-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

type CatalogErrorProps = Readonly<{ message: string; onRetry: () => void }>;

function CatalogError({ message, onRetry }: CatalogErrorProps) {
  return (
    <>
      <AppHeader />
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12">
        <div className="flex flex-col items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-6 py-12 text-center">
          <AlertCircle className="size-6 text-[var(--error)]" />
          <h1 className="mt-4 text-lg font-semibold">Library unavailable</h1>
          <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">{message}</p>
          <Button className="mt-6" onClick={onRetry} variant="outline">
            <RefreshCw data-icon="inline-start" className="size-4" />
            Try again
          </Button>
        </div>
      </section>
    </>
  );
}

export function DeckCatalog() {
  const query = useQuery(deckCatalogQueryOptions);
  const downloadMutation = useMutation(downloadDeckMutationOptions);
  const [search, setSearch] = useState("");
  const onSearch = useCallback((value: string) => setSearch(value.toLowerCase()), []);
  const decks =
    query.data?.filter((deck) =>
      (deck.title + " " + deck.description).toLowerCase().includes(search)
    ) ?? [];

  if (query.isPending) {
    return (
      <>
        <AppHeader />
        <section className="mx-auto max-w-6xl px-6 pb-8 pt-10">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-5 h-11 max-w-xl" />
        </section>
        <DeckGridSkeleton />
      </>
    );
  }
  if (query.isError) {
    return <CatalogError message={query.error.message} onRetry={() => query.refetch()} />;
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Decks</h1>
          <span className="text-sm text-[var(--text-secondary)]">
            {decks.length} of {query.data.length}
          </span>
        </div>
        <DeckSearchForm onSearch={onSearch} />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.length === 0 ? (
            <p className="col-span-full rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
              No decks match this search.
            </p>
          ) : (
            decks.map((deck) => (
              <article
                className="group relative flex min-h-64 flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-sm transition-colors hover:border-[var(--interactive)] hover:bg-[var(--surface-hover)]"
                key={deck.id}
              >
                <Link
                  aria-label={"Inspect " + deck.title}
                  className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive)]"
                  href={"/decks/" + deck.id}
                />
                <div className="pointer-events-none relative">
                  <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                    <span className="font-medium text-[var(--text-secondary)]">
                      v{deck.version}
                    </span>
                    <span>{deck.size}</span>
                  </div>
                  <h2 className="mt-8 text-xl font-semibold tracking-tight">{deck.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                    {deck.description}
                  </p>
                </div>
                <div className="relative z-10 flex items-center justify-end gap-2">
                  <Button
                    aria-label={"Inspect " + deck.title}
                    asChild
                    className="size-9 p-0"
                    size="default"
                    title="Inspect deck"
                    variant="outline"
                  >
                    <Link href={"/decks/" + deck.id}>
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    aria-label={"Download " + deck.title}
                    className="size-9 p-0"
                    disabled={downloadMutation.isPending}
                    onClick={() =>
                      downloadMutation.mutate(deck.id, {
                        onSuccess: ({ url }) => window.location.assign(url),
                      })
                    }
                    size="default"
                    title="Download deck"
                    variant="outline"
                  >
                    {downloadMutation.isPending && downloadMutation.variables === deck.id ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
        {downloadMutation.isError && (
          <p className="mt-4 text-sm text-[var(--error)]" role="alert">
            {downloadMutation.error.message}
          </p>
        )}
      </main>
    </>
  );
}
