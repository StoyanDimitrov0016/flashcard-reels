type LoginPageProps = Readonly<{
  searchParams: Promise<{ error?: string }>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--interactive)]">Internal access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Flashcard Reels</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Enter the shared team password to continue.
        </p>
        <form action="/api/auth/login" method="post" className="mt-8 space-y-4">
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            autoComplete="current-password"
            className="h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--canvas)] px-3 outline-none focus:ring-2 focus:ring-[var(--interactive)]"
            id="password"
            name="password"
            required
            type="password"
          />
          {error !== undefined && (
            <p className="text-sm text-[var(--error)]">Incorrect password.</p>
          )}
          <button
            className="h-11 w-full rounded-md bg-[var(--action-primary)] px-4 font-medium text-[var(--action-primary-text)]"
            type="submit"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
