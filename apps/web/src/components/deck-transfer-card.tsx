"use client";

import { QrCode, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeckTransferCard({ deckId }: Readonly<{ deckId: string }>) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const value = mounted ? window.location.origin + "/decks/" + deckId : "";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label="Show phone transfer QR code"
          className="size-10 p-0"
          title="Show QR code"
          variant="outline"
        >
          <QrCode className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open on your phone</DialogTitle>
          <DialogDescription>
            Scan the code to open this protected deck page on your phone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center rounded-xl bg-white p-5">
          {mounted ? (
            <QRCodeSVG
              aria-label="QR code for protected deck page"
              level="H"
              marginSize={4}
              size={220}
              title="Scan to open this deck"
              value={value}
            />
          ) : (
            <span className="py-24 text-xs text-[var(--text-tertiary)]">Preparing code...</span>
          )}
        </div>
        <p className="flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Smartphone className="size-3.5" />
          Sign in on the phone before downloading.
        </p>
      </DialogContent>
    </Dialog>
  );
}
