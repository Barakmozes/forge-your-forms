// ============================================
// Shared CORS Headers for FormForge Edge Functions
// Import: import { corsHeaders } from "../_shared/cors.ts";
// ============================================

/**
 * Standard CORS headers for edge functions that accept
 * browser requests with Supabase auth tokens.
 */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Extended CORS headers for the REST API (api-v1) which also
 * accepts X-API-Key and needs explicit method listing.
 */
export const apiCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Helper to create a JSON response with CORS headers.
 */
export function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = corsHeaders,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/**
 * Helper to create a JSON error response with CORS headers.
 */
export function jsonError(
  error: string,
  status: number,
  headers: Record<string, string> = corsHeaders,
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns a Response if it's an OPTIONS request, otherwise null.
 */
export function handleCors(
  req: Request,
  headers: Record<string, string> = corsHeaders,
): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  return null;
}
