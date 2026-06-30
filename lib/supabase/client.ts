"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv, readPublicEnv } from "@/lib/env";

export function hasSupabaseBrowserEnv() {
  return Boolean(readPublicEnv());
}

export function createClientSupabase() {
  const env = getPublicEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
