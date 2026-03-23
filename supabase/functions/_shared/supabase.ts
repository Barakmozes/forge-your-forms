// ============================================
// Shared Supabase Client for FormForge Edge Functions
// Import: import { supabase, SUPABASE_URL } from "../_shared/supabase.ts";
// ============================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

export const SUPABASE_URL: string = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY: string =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
export const SUPABASE_ANON_KEY: string =
  Deno.env.get("SUPABASE_ANON_KEY") ?? "";

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
 * Decode and extract claims from a JWT payload without verification.
 * The Supabase gateway (verify_jwt: true) already validates the token
 * before Edge Functions execute, so we only need to decode the payload.
 * Includes a defensive exp check as a safety net.
 */
export function decodeJwtPayload(token: string): { sub: string; email?: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  base64 += "=".repeat(padLength);
  const payloadJson = atob(base64);
  const payload = JSON.parse(payloadJson);
  if (!payload.sub) throw new Error("No sub claim in JWT");
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return { sub: payload.sub, email: payload.email };
}

/**
 * Authenticate a request using the Authorization header (JWT).
 * Decodes the JWT payload to extract user ID and email.
 * The Supabase gateway validates the token before the function runs,
 * so we only need to decode — no HTTP round-trip to auth service.
 * Returns the authenticated user or null.
 */
export async function authenticateUser(
  req: Request,
): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error("authenticateUser: no Authorization header");
    return null;
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const { sub, email } = decodeJwtPayload(token);
    return { id: sub, email };
  } catch (err) {
    console.error("authenticateUser failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
