"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return <div aria-hidden className="size-9 rounded-md border border-[var(--border-subtle)]" />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      aria-label={"Switch to " + (isDark ? "light" : "dark") + " theme"}
      className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive)]"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
    >
      {isDark ? (
        <Moon data-icon="inline-start" className="size-4" />
      ) : (
        <Sun data-icon="inline-start" className="size-4" />
      )}
      <span className="sr-only">{isDark ? "Dark" : "Light"} theme active</span>
    </button>
  );
}
