"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

export default function PlaidConnectButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready to connect.");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function createLinkToken() {
      setError(null);
      const response = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Could not create Plaid link token");
      }

      if (!cancelled) {
        setLinkToken(body.link_token);
      }
    }

    createLinkToken().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Could not prepare Plaid Link");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const onSuccess = useCallback(async (publicToken: string) => {
    setStatus("Saving connected account...");
    setError(null);

    const response = await fetch("/api/plaid/exchange-public-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_token: publicToken })
    });
    const body = await response.json();

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
      <button type="button" onClick={() => open()} disabled={!ready || !linkToken}>
        Connect bank
      </button>
      <span className={error ? "error" : "status"}>{error ?? status}</span>
    </div>
  );
}
