"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClientSupabase, hasSupabaseBrowserEnv } from "@/lib/supabase/client";

const tools = [
  "get_accounts",
  "get_transactions",
  "get_spend_summary",
  "get_cash_flow",
  "get_recurring_charges",
  "get_unusual_spend",
  "list_alert_rules",
  "create_alert_rule",
  "list_alerts",
  "dismiss_alert"
];

export default function McpAccessPanel() {
  const hasEnv = hasSupabaseBrowserEnv();
  const supabase = hasEnv ? createClientSupabase() : null;
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const requestBody = useMemo(
    () =>
      JSON.stringify(
        {
          user_id: user?.id ?? "sign-in-required",
          tool: "get_spend_summary",
          arguments: {
            start_date: "2026-04-01",
            end_date: "2026-06-30",
            group_by: "category"
          }
        },
        null,
        2
      ),
    [user?.id]
  );

  async function copyRequestBody() {
    await navigator.clipboard.writeText(requestBody);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!hasEnv || !user) {
    return null;
  }

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>MCP Access</h2>
          <p className="status">Use this endpoint with the MCP key from your local environment.</p>
        </div>
        <button type="button" className="secondary-button" onClick={copyRequestBody}>
          {copied ? "Copied" : "Copy request"}
        </button>
      </div>

      <div className="mcp-grid">
        <div>
          <h3>Endpoint</h3>
          <code className="code-block">POST /api/mcp</code>
        </div>
        <div>
          <h3>User ID</h3>
          <code className="code-block">{user.id}</code>
        </div>
      </div>

      <pre className="request-preview">{requestBody}</pre>

      <ul className="tool-list">
        {tools.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>
    </section>
  );
}
