"use client";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export function createSupabaseBrowserClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey());
}
