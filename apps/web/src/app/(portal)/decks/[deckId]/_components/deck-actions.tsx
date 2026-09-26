import { Download, Smartphone } from "lucide-react";

import type { DeckSummary } from "@/server/decks";

import { SendToPhoneDialog } from "@/components/send-to-phone-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeckActionsProps = Readonly<{
  className?: string;
  deck: Pick<DeckSummary, "id" | "title">;
}>;

export function DeckActions({ className, deck }: DeckActionsProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <SendToPhoneDialog deckId={deck.id} deckTitle={deck.title}>
        <Button className="flex-1">
          <Smartphone />
          Send to phone
        </Button>
      </SendToPhoneDialog>
      <Button
        className="flex-1"
        variant="outline"
        nativeButton={false}
        render={<a download href={`/decks/${deck.id}/download`} />}
      >
        <Download />
        Download
      </Button>
    </div>
  );
}
