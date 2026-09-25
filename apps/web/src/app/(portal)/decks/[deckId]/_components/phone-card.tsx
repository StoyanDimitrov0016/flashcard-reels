import type { ReactNode } from "react";

import { MousePointerClick } from "lucide-react";

import type { DeckCard } from "@/server/decks";

import { FlashcardText } from "@/components/flashcard-text";
import { cn } from "@/lib/utils";

type CardFaceProps = Readonly<{
  children: ReactNode;
  footer: ReactNode;
  hidden: boolean;
  label: string;
  position: string;
  side: "front" | "back";
}>;

function CardFace({ children, footer, hidden, label, position, side }: CardFaceProps) {
  return (
    <span
      aria-hidden={hidden}
      className={cn(
        "absolute inset-0 flex flex-col rounded-[2.25rem] border border-border bg-background px-6 pt-12 pb-6 backface-hidden",
        side === "back" && "rotate-y-180"
      )}
    >
      <span className="flex items-center justify-between text-xs font-medium text-subtle-foreground">
        <span className="tracking-wide uppercase">{label}</span>
        <span className="tabular-nums">{position}</span>
      </span>
      <span className="-mr-3 flex min-h-0 flex-1 flex-col justify-center-safe overflow-y-auto py-6 pr-3 [scrollbar-width:thin]">
        {children}
      </span>
      <span className="flex items-center justify-center gap-1.5 text-xs text-subtle-foreground">
        {footer}
      </span>
    </span>
  );
}

type FlipHintProps = Readonly<{ action: string }>;

function FlipHint({ action }: FlipHintProps) {
  return (
    <>
      <MousePointerClick aria-hidden className="size-3.5" />
      {/* The keyboard hints sit under the phone, so the phone only names the pointer action. */}
      <span className="md:hidden">Tap {action}</span>
      <span className="hidden md:inline">Click {action}</span>
    </>
  );
}

type PhoneCardProps = Readonly<{
  card: DeckCard;
  onFlip: () => void;
  position: number;
  revealed: boolean;
  total: number;
}>;

/**
 * A card framed like the phone app's reel. Clicking flips it with the reel's rotation: 520 ms,
 * ease-in-out cubic, around the vertical axis.
 */
export function PhoneCard({ card, onFlip, position, revealed, total }: PhoneCardProps) {
  const positionLabel = `${position} / ${total}`;

  return (
    // Sized to the viewport height so the whole phone and its controls stay on screen.
    <div className="mx-auto w-full max-w-[max(15rem,min(21rem,calc((100dvh-13rem)*0.53)))] rounded-[2.75rem] border border-input bg-muted p-2.5 shadow-lg">
      <div className="relative aspect-[9/17] perspective-[1200px]">
        <span
          aria-hidden
          className="pointer-events-none absolute top-4 left-1/2 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-input"
        />
        <button
          className="absolute inset-0 cursor-pointer rounded-[2.25rem] text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          onClick={onFlip}
          type="button"
        >
          <span
            className={cn(
              "relative block size-full transition-transform duration-[520ms] ease-[cubic-bezier(0.65,0,0.35,1)] transform-3d",
              revealed && "rotate-y-180"
            )}
          >
            <CardFace
              footer={<FlipHint action="to reveal" />}
              hidden={revealed}
              label="Question"
              position={positionLabel}
              side="front"
            >
              <span className="text-xl leading-snug font-semibold tracking-tight text-balance">
                <FlashcardText text={card.question} />
              </span>
            </CardFace>
            <CardFace
              footer={<FlipHint action="to flip back" />}
              hidden={!revealed}
              label="Answer"
              position={positionLabel}
              side="back"
            >
              <span className="text-base leading-7 whitespace-pre-wrap text-foreground">
                <FlashcardText text={card.answer} />
              </span>
            </CardFace>
          </span>
        </button>
      </div>
    </div>
  );
}
