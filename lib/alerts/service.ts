import { createAdminSupabase } from "@/lib/supabase/server";
import {
  alertStatusQuerySchema,
  createAlertRuleSchema,
  validateAlertConfig
} from "./rules";
import type { z } from "zod";

export async function listAlertRules(userId: string) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("alert_rules")
    .select("id,type,name,config,enabled,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return { alert_rules: data ?? [] };
}

export async function createAlertRule(userId: string, input: z.infer<typeof createAlertRuleSchema>) {
  const supabase = createAdminSupabase();
  const config = validateAlertConfig(input.type, input.config);
  const { data, error } = await supabase
    .from("alert_rules")
    .insert({
      user_id: userId,
      type: input.type,
      name: input.name,
      config,
      enabled: true
    })
    .select("id,type,name,config,enabled,created_at")
    .single();

  if (error) {
    throw error;
  }

  return { alert_rule: data };
}

export async function listAlerts(userId: string, query: z.infer<typeof alertStatusQuerySchema>) {
  const supabase = createAdminSupabase();
  let request = supabase
    .from("alerts")
    .select("id,type,title,message,severity,status,created_at,dismissed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (query.status !== "all") {
    request = request.eq("status", query.status);
  }

  const { data, error } = await request;
  if (error) {
    throw error;
  }

  return { alerts: data ?? [] };
}

export async function dismissAlert(userId: string, alertId: string) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("alerts")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("id", alertId)
    .select("id,status,dismissed_at")
    .single();

  if (error) {
    throw error;
  }

  return { alert: data };
}
