import { createAdminSupabase } from "@/lib/supabase/server";

const REDACTED_KEYS = new Set([
  "access_token",
  "public_token",
  "encrypted_access_token",
  "PLAID_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY"
]);

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, REDACTED_KEYS.has(key) ? "[redacted]" : redact(entry)])
  );
}

export async function logAuditEvent(params: {
  userId: string | null;
  action: string;
  source: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminSupabase();

  await supabase.from("audit_logs").insert({
    user_id: params.userId,
    action: params.action,
    source: params.source,
    metadata: redact(params.metadata ?? {})
  });
}
