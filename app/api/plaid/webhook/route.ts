import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));

  await logAuditEvent({
    userId: null,
    action: "plaid.webhook_received",
    source: "plaid",
    metadata: {
      webhook_type: payload.webhook_type,
      webhook_code: payload.webhook_code,
      item_id: payload.item_id
    }
  });

  return NextResponse.json({ ok: true });
}
