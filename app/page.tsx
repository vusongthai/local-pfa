import PlaidConnectButton from "@/components/PlaidConnectButton";

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

        <section className="panel">
          <p>
            This first build stores encrypted Plaid access tokens server-side, persists account balances in
            Supabase, and keeps all sensitive credentials out of the browser.
          </p>
          <PlaidConnectButton />
        </section>
      </div>
    </main>
  );
}
