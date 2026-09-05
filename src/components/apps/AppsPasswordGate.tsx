"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock } from "lucide-react";

export function AppsPasswordGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/apps/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(
          data.error === "not_configured"
            ? "This page isn't set up yet."
            : "That password isn't right.",
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 sm:px-6"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--gradient-gold)" }}
      />

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className="h-1.5 w-full" style={{ background: "var(--gradient-gold)" }} />
        <div className="p-7 sm:p-8">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2.5 shadow-md ring-1 ring-border">
              <Image
                src="/apps/novamail-icon.png"
                alt="NOVARISE"
                width={64}
                height={64}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
              NOVARISE
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold text-foreground">
              App Downloads
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Enter the access password to continue
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoFocus
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-gold"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-navy-foreground shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--navy)" }}
            >
              {loading ? "Checking…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
