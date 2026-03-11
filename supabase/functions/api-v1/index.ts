// ============================================
// REST API v1 Edge Function (Agent 9)
// Public REST API for FormForge (Growth+ plan).
// Deploy: supabase functions deploy api-v1
// Secrets: SUPABASE_SERVICE_ROLE_KEY
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ─── Rate Limiting (in-memory) ──────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(keyHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyHash);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyHash, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// ─── Auth Middleware ─────────────────────────────────────────────────────────

interface AuthResult {
  workspaceId: string;
  keyHash: string;
}

async function authenticateApiKey(req: Request): Promise<AuthResult | Response> {
  const apiKey = req.headers.get("x-api-key") || req.headers.get("X-API-Key");

  if (!apiKey) {
    return jsonError("unauthorized", "Missing X-API-Key header", 401);
  }

  // Hash the provided key
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Look up key in database
  const { data: keyRecord, error } = await supabase
    .from("api_keys")
    .select("id, workspace_id, revoked_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !keyRecord) {
    return jsonError("unauthorized", "Invalid API key", 401);
  }

  if (keyRecord.revoked_at) {
    return jsonError("unauthorized", "API key has been revoked", 401);
  }

  // Check rate limit
  if (!checkRateLimit(keyHash)) {
    return jsonError("rate_limited", "Rate limit exceeded. Max 100 requests per minute.", 429);
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id)
    .then(() => {});

  return { workspaceId: keyRecord.workspace_id, keyHash };
}

// ─── Response Helpers ───────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Route Parsing ──────────────────────────────────────────────────────────

function parsePath(url: URL): { resource: string; id?: string } {
  // Path format: /api-v1/forms, /api-v1/forms/:id, /api-v1/submissions, /api-v1/waitlist
  const pathname = url.pathname;
  const parts = pathname.split("/").filter(Boolean);

  // Handle both /api-v1/forms and /forms (depending on how Supabase routes)
  const startIdx = parts.findIndex((p) => p === "api-v1");
  const resourceParts = startIdx >= 0 ? parts.slice(startIdx + 1) : parts;

  return {
    resource: resourceParts[0] ?? "",
    id: resourceParts[1],
  };
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async function listForms(workspaceId: string, url: URL): Promise<Response> {
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const perPage = Math.min(parseInt(url.searchParams.get("per_page") ?? "25"), 100);
  const offset = (page - 1) * perPage;

  const { data, error, count } = await supabase
    .from("forms")
    .select("id, title, description, mode, status, submission_count, created_at, updated_at", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) return jsonError("internal", error.message, 500);

  return jsonResponse({
    data: data ?? [],
    pagination: { page, per_page: perPage, total: count ?? 0 },
  });
}

async function getForm(workspaceId: string, formId: string): Promise<Response> {
  const { data, error } = await supabase
    .from("forms")
    .select("id, title, description, fields, settings, mode, status, branding, submission_count, created_at, updated_at")
    .eq("id", formId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) return jsonError("not_found", "Form not found", 404);

  return jsonResponse({ data });
}

async function listSubmissions(workspaceId: string, url: URL): Promise<Response> {
  const formId = url.searchParams.get("form_id");
  if (!formId) return jsonError("bad_request", "form_id query parameter is required", 400);

  // Verify form belongs to workspace
  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("id", formId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!form) return jsonError("not_found", "Form not found", 404);

  const page = parseInt(url.searchParams.get("page") ?? "1");
  const perPage = Math.min(parseInt(url.searchParams.get("per_page") ?? "25"), 100);
  const offset = (page - 1) * perPage;

  const { data, error, count } = await supabase
    .from("submissions")
    .select("id, form_id, data, submitted_by_email, submitted_by_name, metadata, status, submitted_at", { count: "exact" })
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) return jsonError("internal", error.message, 500);

  return jsonResponse({
    data: data ?? [],
    pagination: { page, per_page: perPage, total: count ?? 0 },
  });
}

async function createSubmission(workspaceId: string, body: Record<string, unknown>): Promise<Response> {
  const formId = body.form_id as string;
  const submissionData = body.data as Record<string, unknown>;

  if (!formId) return jsonError("bad_request", "form_id is required", 400);
  if (!submissionData) return jsonError("bad_request", "data is required", 400);

  // Verify form belongs to workspace and is active
  const { data: form } = await supabase
    .from("forms")
    .select("id, status")
    .eq("id", formId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!form) return jsonError("not_found", "Form not found", 404);
  if (form.status !== "active") return jsonError("bad_request", "Form is not active", 400);

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      form_id: formId,
      data: submissionData,
      submitted_by_email: (body.email as string) ?? null,
      submitted_by_name: (body.name as string) ?? null,
    })
    .select("id, form_id, data, submitted_at")
    .single();

  if (error) return jsonError("internal", error.message, 500);

  return jsonResponse({ data }, 201);
}

async function listWaitlist(workspaceId: string, url: URL): Promise<Response> {
  const formId = url.searchParams.get("form_id");
  if (!formId) return jsonError("bad_request", "form_id query parameter is required", 400);

  // Verify form belongs to workspace
  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("id", formId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!form) return jsonError("not_found", "Form not found", 404);

  const page = parseInt(url.searchParams.get("page") ?? "1");
  const perPage = Math.min(parseInt(url.searchParams.get("per_page") ?? "25"), 100);
  const offset = (page - 1) * perPage;

  const { data, error, count } = await supabase
    .from("waitlist_entries")
    .select("id, email, name, position, referral_code, referral_count, status, created_at", { count: "exact" })
    .eq("form_id", formId)
    .order("position", { ascending: true })
    .range(offset, offset + perPage - 1);

  if (error) return jsonError("internal", error.message, 500);

  return jsonResponse({
    data: data ?? [],
    pagination: { page, per_page: perPage, total: count ?? 0 },
  });
}

async function createWaitlistEntry(workspaceId: string, body: Record<string, unknown>): Promise<Response> {
  const formId = body.form_id as string;
  const email = body.email as string;
  const entryName = (body.name as string) ?? null;

  if (!formId) return jsonError("bad_request", "form_id is required", 400);
  if (!email) return jsonError("bad_request", "email is required", 400);

  // Verify form belongs to workspace and is active
  const { data: form } = await supabase
    .from("forms")
    .select("id, status, mode")
    .eq("id", formId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!form) return jsonError("not_found", "Form not found", 404);
  if (form.status !== "active") return jsonError("bad_request", "Form is not active", 400);
  if (form.mode !== "waitlist") return jsonError("bad_request", "Form is not a waitlist", 400);

  // Check for duplicate
  const { data: existing } = await supabase
    .from("waitlist_entries")
    .select("id")
    .eq("form_id", formId)
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existing) return jsonError("conflict", "Email already on waitlist", 409);

  // Generate referral code
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const referralCode = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

  // Get next position
  const { data: maxRow } = await supabase
    .from("waitlist_entries")
    .select("position")
    .eq("form_id", formId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (maxRow?.position ?? 0) + 1;

  const { data, error } = await supabase
    .from("waitlist_entries")
    .insert({
      form_id: formId,
      email: email.toLowerCase().trim(),
      name: entryName,
      referral_code: referralCode,
      position,
    })
    .select("id, email, name, position, referral_code, created_at")
    .single();

  if (error) return jsonError("internal", error.message, 500);

  return jsonResponse({ data }, 201);
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof Response) return authResult;

  const { workspaceId } = authResult;
  const url = new URL(req.url);
  const { resource, id } = parsePath(url);

  try {
    // Route requests
    switch (resource) {
      case "forms":
        if (req.method === "GET") {
          return id ? await getForm(workspaceId, id) : await listForms(workspaceId, url);
        }
        return jsonError("method_not_allowed", `${req.method} not supported for /forms`, 405);

      case "submissions":
        if (req.method === "GET") {
          return await listSubmissions(workspaceId, url);
        }
        if (req.method === "POST") {
          const body = await req.json();
          return await createSubmission(workspaceId, body);
        }
        return jsonError("method_not_allowed", `${req.method} not supported for /submissions`, 405);

      case "waitlist":
        if (req.method === "GET") {
          return await listWaitlist(workspaceId, url);
        }
        if (req.method === "POST") {
          const body = await req.json();
          return await createWaitlistEntry(workspaceId, body);
        }
        return jsonError("method_not_allowed", `${req.method} not supported for /waitlist`, 405);

      default:
        return jsonError("not_found", `Unknown resource: ${resource}`, 404);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonError("internal", message, 500);
  }
});
