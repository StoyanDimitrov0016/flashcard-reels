"use client";

import { Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";

export function DeckTransferCard({ deckId }: Readonly<{ deckId: string }>) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const value = mounted ? window.location.origin + "/decks/" + deckId : "";
  return (
    <aside className="mt-8 flex flex-col items-center gap-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-center sm:flex-row sm:text-left">
      <div className="flex size-40 items-center justify-center rounded-xl bg-white p-3">
        {mounted ? (
          <QRCodeSVG
            aria-label="QR code for protected deck page"
            marginSize={4}
            level="H"
            size={144}
            title="Scan to open this deck"
            value={value}
          />
        ) : (
          <span className="text-xs text-[var(--text-tertiary)]">Preparing code...</span>
        )}
      </div>
      <div>
        <p className="flex items-center justify-center gap-2 text-sm font-semibold sm:justify-start">
          <Smartphone className="size-4 text-[var(--interactive)]" />
          Continue on your phone
        </p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
          Scan this code to open the protected deck page on your phone. Sign in there before
          downloading.
        </p>
      </div>
    </aside>
  );
}
