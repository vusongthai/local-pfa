"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { createClientSupabase, hasSupabaseBrowserEnv } from "@/lib/supabase/client";

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export default function PlaidConnectButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready to connect.");
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!hasSupabaseBrowserEnv()) {
      setStatus("Supabase env is missing.");
      return;
    }

    const supabase = createClientSupabase();

    async function createLinkToken() {
      setError(null);
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setAuthenticated(false);
        setStatus("Sign in first.");
        return;
      }

      setAuthenticated(true);
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
        credentials: "include"
      });
      const body = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(body.error ?? "Could not create Plaid link token");
      }

      if (!cancelled) {
        setLinkToken(body.link_token);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
      setLinkToken(null);
      setStatus(session?.user ? "Preparing Plaid Link..." : "Sign in first.");
      if (session?.user) {
        createLinkToken().catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Could not prepare Plaid Link");
          }
        });
      }
    });

    createLinkToken().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Could not prepare Plaid Link");
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const onSuccess = useCallback(async (publicToken: string) => {
    setStatus("Saving connected account...");
    setError(null);

    const response = await fetch("/api/plaid/exchange-public-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ public_token: publicToken })
    });
    const body = await readJsonResponse(response);

    if (!response.ok) {
      setError(body.error ?? "Could not save connected account");
      setStatus("Connection failed.");
      return;
    }

    setStatus(`Connected ${body.accounts_count} account${body.accounts_count === 1 ? "" : "s"}.`);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess
  });

  return (
    <div className="actions">
      <button type="button" onClick={() => open()} disabled={!authenticated || !ready || !linkToken}>
        Connect bank
      </button>
      <span className={error ? "error" : "status"}>{error ?? status}</span>
    </div>
  );
}
