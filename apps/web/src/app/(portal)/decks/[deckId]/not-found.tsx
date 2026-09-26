import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";

export default function DeckNotFound() {
  return (
    <PageContainer className="py-16">
      <EmptyState
        action={
          <Button asChild variant="primary">
            <Link href="/">Back to decks</Link>
          </Button>
        }
        description="This deck is not published, or it was removed. Check the link or choose another deck."
        icon={SearchX}
        title="Deck not found"
      />
    </PageContainer>
  );
}
