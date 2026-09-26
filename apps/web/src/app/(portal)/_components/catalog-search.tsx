"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { runtimeRoute } from "@/lib/routes";

/** Filters the catalog through the `q` search parameter, so a filtered view can be shared. */
export function CatalogSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() => searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  const applyQuery = (query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
    const search = params.toString();
    startTransition(() =>
      router.replace(runtimeRoute(search ? `${pathname}?${search}` : pathname), { scroll: false })
    );
  };
  const applyQueryLater = useDebouncedCallback(applyQuery, 200);

  const clear = () => {
    setValue("");
    applyQuery("");
  };

  useHotkeys({ "/": () => inputRef.current?.focus() });

  return (
    <div className="relative w-full sm:max-w-sm">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
      />
      <input
        aria-label="Search decks"
        className="h-10 w-full rounded-md border border-input bg-card pr-16 pl-9 text-[15px] outline-none placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        onChange={(event) => {
          setValue(event.target.value);
          applyQueryLater(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            clear();
          }
        }}
        placeholder="Search decks"
        ref={inputRef}
        type="search"
        value={value}
      />
      <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1.5">
        {pending && <Spinner className="size-3.5 text-subtle-foreground" />}
        {value ? (
          <button
            aria-label="Clear search"
            className="rounded p-0.5 text-subtle-foreground hover:bg-accent hover:text-foreground"
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <Kbd aria-hidden className="hidden sm:inline-flex">
            /
          </Kbd>
        )}
      </div>
    </div>
  );
}
