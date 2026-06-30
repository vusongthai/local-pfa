import { createAdminSupabase } from "@/lib/supabase/server";

export type FinanceAccount = {
  id: string;
  name: string | null;
  official_name: string | null;
  type: string | null;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency_code: string | null;
  is_active: boolean | null;
  last_balance_sync_at: string | null;
};

export async function getAccountsForUser(userId: string): Promise<FinanceAccount[]> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id,name,official_name,type,subtype,mask,current_balance,available_balance,iso_currency_code,is_active,last_balance_sync_at"
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw error;
  }

  return data ?? [];
}
