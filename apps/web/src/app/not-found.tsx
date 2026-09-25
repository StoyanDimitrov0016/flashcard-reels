import { Compass } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <div className="w-full">
        <EmptyState
          action={
            <Button nativeButton={false} render={<Link href="/" />}>
              Go to decks
            </Button>
          }
          description="The page you opened does not exist."
          icon={Compass}
          title="Page not found"
        />
      </div>
    </main>
  );
}
