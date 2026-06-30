"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClientSupabase, hasSupabaseBrowserEnv } from "@/lib/supabase/client";

export default function AuthPanel() {
  const hasEnv = hasSupabaseBrowserEnv();
  const supabase = hasEnv ? createClientSupabase() : null;
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Sign in before connecting Plaid.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
        setStatus(data.user ? `Signed in as ${data.user.email}` : "Sign in before connecting Plaid.");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setStatus(session?.user ? `Signed in as ${session.user.email}` : "Sign in before connecting Plaid.");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function authenticate(mode: "sign-in" | "sign-up") {
    if (!supabase) {
      setStatus("Supabase env is missing.");
      return;
    }

    setBusy(true);
    setStatus(mode === "sign-in" ? "Signing in..." : "Creating account...");

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setStatus(result.error.message);
    } else if (mode === "sign-up" && !result.data.session) {
      setStatus("Account created. Check your email if confirmation is enabled.");
    } else {
      setStatus(`Signed in as ${result.data.user?.email ?? email}`);
    }

    setBusy(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await authenticate("sign-in");
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    setBusy(true);
    await supabase.auth.signOut();
    setStatus("Signed out.");
    setBusy(false);
  }

  if (!hasEnv) {
    return (
      <section className="panel compact-panel">
        <p className="error">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server.
        </p>
      </section>
    );
  }

  if (user) {
    return (
      <section className="panel compact-panel">
        <p className="status">{status}</p>
        <div className="actions">
          <button type="button" onClick={signOut} disabled={busy}>
            Sign out
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel compact-panel">
      <form className="auth-form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            minLength={6}
            required
          />
        </label>
        <div className="actions">
          <button type="submit" disabled={busy}>
            Sign in
          </button>
          <button type="button" className="secondary-button" onClick={() => authenticate("sign-up")} disabled={busy}>
            Create account
          </button>
          <span className={status.toLowerCase().includes("error") ? "error" : "status"}>{status}</span>
        </div>
      </form>
    </section>
  );
}
