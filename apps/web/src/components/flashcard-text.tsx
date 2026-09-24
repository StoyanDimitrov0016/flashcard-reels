import { Fragment } from "react";

import { splitFlashcardText } from "@/lib/flashcard-text";

type FlashcardTextProps = Readonly<{ text: string }>;

/** Renders question or answer text with backtick spans as inline code. */
export function FlashcardText({ text }: FlashcardTextProps) {
  return splitFlashcardText(text).map((segment) =>
    segment.code ? (
      <code
        className="rounded-sm bg-code-surface px-[0.3em] py-[0.1em] font-mono text-[0.88em] text-code"
        key={segment.offset}
      >
        {segment.text}
      </code>
    ) : (
      <Fragment key={segment.offset}>{segment.text}</Fragment>
    )
  );
}
