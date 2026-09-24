import type { Metadata } from "next";

import Image from "next/image";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

type LoginPageProps = Readonly<{ searchParams: Promise<{ next?: string }> }>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-navigation px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            alt=""
            className="size-12 rounded-xl"
            height={48}
            priority
            src="/app-logo.png"
            width={48}
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Flashcard Reels</h1>
          <p className="mt-2 text-sm text-fg-muted">Sign in to the internal deck portal.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <LoginForm returnTo={next} />
        </div>
        <p className="mt-6 text-center text-xs text-fg-subtle">
          Access uses the shared team password.
        </p>
      </div>
    </main>
  );
}
