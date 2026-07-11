import "server-only";

import { createClient } from "@supabase/supabase-js";

type SupabaseClientOptions = {
  secret?: boolean;
};

export function isSupabaseConfigured(options: SupabaseClientOptions = {}) {
  const url = getSupabaseUrl();
  const key = options.secret ? process.env.SUPABASE_SECRET_KEY : getSupabasePublishableKey();
  return Boolean(url && key);
}

export function createSupabaseServerClient(options: SupabaseClientOptions = {}) {
  const url = getSupabaseUrl();
  const key = options.secret ? process.env.SUPABASE_SECRET_KEY : getSupabasePublishableKey();

  if (!url || !key) {
    throw new Error(
      options.secret
        ? "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY."
        : "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabasePublishableKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
