"use client";

import { AlertCircle, LoaderCircle, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { downloadDeckMutationOptions } from "@/lib/deck-queries";

type DeckTransferCardProps = Readonly<{ deckId: string }>;

export function DeckTransferCard({ deckId }: DeckTransferCardProps) {
  const download = useMutation(downloadDeckMutationOptions);

  const handleOpenChange = (open: boolean) => {
    download.reset();
    if (open) {
      download.mutate(deckId);
    }
  };

  const qrContent = (() => {
    if (download.data) {
      return (
        <QRCodeSVG
          aria-label="QR code for deck package download"
          boostLevel
          level="L"
          marginSize={4}
          size={220}
          title="Scan to import this deck"
          value={download.data.url}
        />
      );
    }
    if (download.isError) {
      return (
        <div
          aria-live="polite"
          className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center"
        >
          <AlertCircle className="size-6 text-[var(--error)]" />
          <span className="text-sm text-[var(--text-secondary)]">{download.error.message}</span>
          <Button onClick={() => download.mutate(deckId)} variant="outline">
            <RefreshCw className="size-4" data-icon="inline-start" />
            Try again
          </Button>
        </div>
      );
    }
    return (
      <span
        aria-live="polite"
        className="flex min-h-[220px] items-center gap-2 text-sm text-[var(--text-secondary)]"
      >
        <LoaderCircle className="size-4 animate-spin" />
        Preparing code…
      </span>
    );
  })();

  return (
    <Dialog onOpenChange={handleOpenChange}>
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
          <DialogTitle>Scan to import</DialogTitle>
          <DialogDescription>
            In Flashcard Reels, choose Import, then Scan QR code.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center rounded-xl bg-white p-5">{qrContent}</div>
        <p className="flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Smartphone className="size-3.5" />
          This code expires shortly.
        </p>
      </DialogContent>
    </Dialog>
  );
}
