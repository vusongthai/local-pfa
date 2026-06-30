"use client";

import { useState } from "react";

type Alert = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  created_at: string;
};

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  return body as T;
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [status, setStatus] = useState("Generate alerts after syncing transactions.");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    setStatus("Loading alerts...");

    try {
      const body = await getJson<{ alerts: Alert[] }>("/api/alerts?status=new");
      setAlerts(body.alerts);
      setStatus(`${body.alerts.length} new alert${body.alerts.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not load alerts.");
    }

    setBusy(false);
  }

  async function generate() {
    setBusy(true);
    setStatus("Generating alerts...");

    try {
      const result = await getJson<{ created: number; evaluated: number }>("/api/alerts/generate", {
        method: "POST"
      });
      setStatus(`Created ${result.created} alerts from ${result.evaluated} evaluated candidates.`);
      await refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not generate alerts.");
      setBusy(false);
    }
  }

  async function dismiss(alertId: string) {
    await getJson(`/api/alerts/${alertId}/dismiss`, { method: "POST" });
    setAlerts((current) => current.filter((alert) => alert.id !== alertId));
  }

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Alerts</h2>
          <p className="status">{status}</p>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={refresh} disabled={busy}>
            Refresh alerts
          </button>
          <button type="button" onClick={generate} disabled={busy}>
            Generate alerts
          </button>
        </div>
      </div>

      <ul className="alert-list">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
              <span>{alert.severity}</span>
            </div>
            <button type="button" className="secondary-button" onClick={() => dismiss(alert.id)}>
              Dismiss
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
