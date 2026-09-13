import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
      <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-1 text-sm text-[var(--text-secondary)]">
        <Smartphone className="size-4" /> Web catalog foundation
      </div>
      <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
        Learn in motion. Keep every deck with you.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
        Flashcard Reels is becoming a web-backed library with private deck files in Cloudflare R2 and short-lived downloads for the mobile app.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button size="lg"><Download className="mr-2 size-4" /> Browse decks soon</Button>
        <Button size="lg" variant="outline">Open the mobile app</Button>
      </div>
    </main>
  );
}
