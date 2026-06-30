"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

function setOwnerSessionCookie(token: string, maxAge: number) {
  document.cookie = `owner_access_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("Login is not configured yet.");
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError || !data.session || !data.user) {
        throw new Error(signInError?.message || "Unable to sign in.");
      }

      const authedSupabase = getSupabase(data.session.access_token);

      if (!authedSupabase) {
        throw new Error("Login is not configured yet.");
      }

      const { data: authRow, error: authError } = await authedSupabase
        .from("business_auth")
        .select("business_id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (authError || !authRow?.business_id) {
        throw new Error("No business is linked to this owner account.");
      }

      setOwnerSessionCookie(data.session.access_token, data.session.expires_in ?? 3600);
      router.push(`/dashboard/${authRow.business_id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.16),transparent_34rem),linear-gradient(180deg,#eef7f5_0%,#f7f8fa_420px)] px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white shadow-md">
          B
        </div>
        <div className="mt-6 text-center">
          <h1 className="text-2xl font-bold text-ink">Business owner login</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to manage bookings, assignments, and schedules.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-brand"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-brand"
              required
            />
          </label>

          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-slate-950 shadow-md transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Signing in" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
