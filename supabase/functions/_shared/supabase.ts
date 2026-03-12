// ============================================
// Shared Supabase Client for FormForge Edge Functions
// Import: import { supabase, SUPABASE_URL } from "../_shared/supabase.ts";
// ============================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

export const SUPABASE_URL: string = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY: string =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/**
 * Pre-initialized Supabase admin client using the service role key.
 * Bypasses RLS — use for server-side operations only.
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Create a fresh Supabase admin client (useful when you need
 * a separate instance, e.g. for execute-workflow).
 */
export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Authenticate a request using the Authorization header (JWT).
 * Returns the authenticated user or null.
 */
export async function authenticateUser(
  req: Request,
): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return { id: user.id, email: user.email };
}
