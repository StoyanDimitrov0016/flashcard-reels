import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { signOut } from "@/app/(portal)/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link className="flex items-center gap-2.5 rounded-md" href="/">
          <Image
            alt=""
            className="size-7 rounded-md"
            height={28}
            priority
            src="/app-logo.png"
            width={28}
          />
          <span className="font-semibold tracking-tight">Flashcard Reels</span>
          <Badge className="hidden sm:inline-flex">Internal</Badge>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={signOut}>
            <Button
              aria-label="Sign out"
              size="icon"
              title="Sign out"
              type="submit"
              variant="ghost"
            >
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
