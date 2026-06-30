"use client";

import { useState } from "react";

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

export default function SyncTransactionsButton() {
  const [status, setStatus] = useState("Ready to sync.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setError(null);
    setStatus("Syncing transactions...");

    const response = await fetch("/api/plaid/sync-transactions", {
      method: "POST",
      credentials: "include"
    });
    const body = await readJsonResponse(response);

    if (!response.ok) {
      setError(body.error ?? "Could not sync transactions");
      setStatus("Sync failed.");
      setBusy(false);
      return;
    }

    setStatus(
      `Synced ${body.items} item${body.items === 1 ? "" : "s"}: ${body.added} added, ${body.modified} modified, ${body.removed} removed.`
    );
    setBusy(false);
  }

  return (
    <div className="actions">
      <button type="button" className="secondary-button" onClick={sync} disabled={busy}>
        Sync transactions
      </button>
      <span className={error ? "error" : "status"}>{error ?? status}</span>
    </div>
  );
}
