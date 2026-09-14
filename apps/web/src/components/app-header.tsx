import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--navigation)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="flex items-center gap-3" href="/">
          <Image
            alt=""
            className="size-9 object-contain"
            height={36}
            priority
            src="/app-logo.png"
            width={36}
          />
          <span className="font-semibold tracking-tight">Flashcard Reels</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
