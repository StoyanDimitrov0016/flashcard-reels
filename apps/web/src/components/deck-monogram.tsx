import { cn } from "@/lib/utils";

const WordStartPattern = /^[A-Za-z0-9]/;

type DeckMonogramProps = Readonly<{ title: string; className?: string }>;

/** A quiet placeholder cover: up to two initials from the deck title. */
export function DeckMonogram({ title, className }: DeckMonogramProps) {
  const initials = title
    .split(/\s+/)
    .filter((word) => WordStartPattern.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-subtle text-sm font-semibold text-fg-muted",
        className
      )}
    >
      {initials}
    </span>
  );
}
