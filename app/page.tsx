import AlertsPanel from "@/components/AlertsPanel";
import AuthPanel from "@/components/AuthPanel";
import FinanceDashboard from "@/components/FinanceDashboard";
import PlaidConnectButton from "@/components/PlaidConnectButton";
import SyncTransactionsButton from "@/components/SyncTransactionsButton";

export default function Home() {
  return (
    <main>
      <div className="shell">
        <div className="topbar">
          <div>
            <h1>Finance MCP</h1>
            <p>
              Connect a Plaid sandbox bank account to begin syncing read-only balances and account metadata.
            </p>
          </div>
        </div>

        <AuthPanel />

        <section className="panel">
          <p>
            This first build stores encrypted Plaid access tokens server-side, persists account balances in
            Supabase, and keeps all sensitive credentials out of the browser.
          </p>
          <PlaidConnectButton />
          <SyncTransactionsButton />
        </section>

        <FinanceDashboard />

        <AlertsPanel />
      </div>
    </main>
  );
}
