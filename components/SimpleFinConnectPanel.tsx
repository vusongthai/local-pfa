"use client";

import { FormEvent, useState } from "react";

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

export default function SimpleFinConnectPanel() {
  const [setupToken, setSetupToken] = useState("");
  const [status, setStatus] = useState("Paste a SimpleFIN setup token after connecting your bank in SimpleFIN Bridge.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus("Connecting SimpleFIN...");

    const response = await fetch("/api/simplefin/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ setup_token: setupToken })
    });
    const body = await readJsonResponse(response);

    if (!response.ok) {
      setError(body.error ?? "Could not connect SimpleFIN");
      setStatus("Connection failed.");
      setBusy(false);
      return;
    }

    setSetupToken("");
    setStatus(`Connected ${body.accounts} account${body.accounts === 1 ? "" : "s"} and synced ${body.transactions} transactions.`);
    setBusy(false);
  }

  async function sync() {
    setBusy(true);
    setError(null);
    setStatus("Syncing SimpleFIN...");

    const response = await fetch("/api/simplefin/sync", {
      method: "POST",
      credentials: "include"
    });
    const body = await readJsonResponse(response);

    if (!response.ok) {
      setError(body.error ?? "Could not sync SimpleFIN");
      setStatus("Sync failed.");
      setBusy(false);
      return;
    }

    setStatus(`Synced ${body.items} connection${body.items === 1 ? "" : "s"} with ${body.transactions} transactions.`);
    setBusy(false);
  }

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>SimpleFIN</h2>
          <p className="status">Connect Chase through SimpleFIN Bridge without uploading bank files.</p>
        </div>
      </div>

      <form className="auth-form" onSubmit={connect}>
        <label>
          Setup token
          <input
            type="password"
            value={setupToken}
            onChange={(event) => setSetupToken(event.target.value)}
            autoComplete="off"
            placeholder="Paste SimpleFIN setup token"
            required
          />
        </label>
        <div className="actions">
          <button type="submit" disabled={busy || !setupToken.trim()}>
            Connect SimpleFIN
          </button>
          <button type="button" className="secondary-button" onClick={sync} disabled={busy}>
            Sync SimpleFIN
          </button>
          <span className={error ? "error" : "status"}>{error ?? status}</span>
        </div>
      </form>
    </section>
  );
}
