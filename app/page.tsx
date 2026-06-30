import AlertsPanel from "@/components/AlertsPanel";
import AuthPanel from "@/components/AuthPanel";
import FinanceDashboard from "@/components/FinanceDashboard";
import McpAccessPanel from "@/components/McpAccessPanel";
import PlaidConnectButton from "@/components/PlaidConnectButton";
import SimpleFinConnectPanel from "@/components/SimpleFinConnectPanel";
import SyncTransactionsButton from "@/components/SyncTransactionsButton";

export default function Home() {
  return (
    <main>
      <div className="shell">
        <div className="topbar">
          <div>
            <h1>Finance MCP</h1>
            <p>
              Connect read-only bank data with SimpleFIN or keep Plaid sandbox around for testing.
            </p>
          </div>
        </div>

        <AuthPanel />

        <section className="panel">
          <p>
            This build stores encrypted connector tokens server-side, persists account balances and transactions in
            Supabase, and keeps sensitive credentials out of the browser.
          </p>
        </section>

        <SimpleFinConnectPanel />

        <section className="panel">
          <p>
            Plaid sandbox remains available for test data and connector development.
          </p>
          <PlaidConnectButton />
          <SyncTransactionsButton />
        </section>

        <FinanceDashboard />

        <AlertsPanel />

        <McpAccessPanel />
      </div>
    </main>
  );
}
