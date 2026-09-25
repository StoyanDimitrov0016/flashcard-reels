"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check, Copy, RefreshCw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useSecondsRemaining } from "@/hooks/use-seconds-remaining";
import { transferLinkMutationOptions } from "@/lib/transfer-link";

const qrSize = 208;

type SendToPhoneDialogProps = Readonly<{
  deckId: string;
  deckTitle: string;
  /** `icon` fits dense surfaces such as catalog cards; `button` shows a labeled action. */
  trigger?: "icon" | "button";
}>;

export function SendToPhoneDialog({
  deckId,
  deckTitle,
  trigger = "button",
}: SendToPhoneDialogProps) {
  const transferLink = useMutation(transferLinkMutationOptions);
  const secondsRemaining = useSecondsRemaining(transferLink.data?.expiresAt);
  const expired = secondsRemaining === 0;
  const [copied, setCopied] = useState(false);

  const createLink = () => {
    setCopied(false);
    transferLink.mutate(deckId);
  };

  const copyLink = async () => {
    if (transferLink.data) {
      await navigator.clipboard.writeText(transferLink.data.url);
      setCopied(true);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        transferLink.reset();
        if (open) {
          createLink();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger === "icon" ? (
          <Button
            aria-label={`Send ${deckTitle} to phone`}
            size="icon"
            title="Send to phone"
            variant="ghost"
          >
            <Smartphone />
          </Button>
        ) : (
          <Button variant="primary">
            <Smartphone />
            Send to phone
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to phone</DialogTitle>
          <DialogDescription>
            Scan this code with Flashcard Reels to install {deckTitle}.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto flex size-[248px] items-center justify-center rounded-xl border border-line bg-white p-5">
          {transferLink.isPending && (
            <Spinner className="size-5 text-neutral-400" label="Creating code" />
          )}
          {transferLink.isError && (
            <div className="flex flex-col items-center gap-3 px-2 text-center" role="alert">
              <AlertCircle className="size-6 text-danger" />
              <p className="text-sm text-neutral-600">{transferLink.error.message}</p>
            </div>
          )}
          {transferLink.data && (
            <QRCodeSVG
              aria-label={`QR code that installs ${deckTitle}`}
              className={expired ? "opacity-15 blur-[2px]" : undefined}
              level="L"
              marginSize={0}
              size={qrSize}
              value={transferLink.data.url}
            />
          )}
          {expired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p className="text-sm font-medium text-neutral-800">This code expired</p>
              <Button onClick={createLink} size="sm" variant="primary">
                <RefreshCw />
                New code
              </Button>
            </div>
          )}
        </div>

        <ol className="grid gap-2 text-sm text-fg-muted">
          {[
            "Open Flashcard Reels on your phone.",
            "Go to Library, then Import, then Scan QR code.",
            "Point the camera at this code.",
          ].map((step, index) => (
            <li className="flex gap-3" key={step}>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-xs font-semibold text-fg">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <p aria-live="polite" className="text-xs text-fg-subtle tabular-nums">
            {transferLink.data && !expired && secondsRemaining !== null
              ? `Expires in ${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`
              : "Codes expire after a few minutes."}
          </p>
          {transferLink.isError ? (
            <Button onClick={createLink} size="sm">
              <RefreshCw />
              Try again
            </Button>
          ) : (
            <Button
              disabled={!transferLink.data || expired}
              onClick={copyLink}
              size="sm"
              variant="ghost"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
