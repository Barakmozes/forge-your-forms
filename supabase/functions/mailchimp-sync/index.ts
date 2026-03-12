// ============================================
// Mailchimp Sync Edge Function (Agent 32)
// Proxies Mailchimp API calls to avoid browser CORS issues.
// Supports two actions: sync (add member) and fetch_lists.
// Deploy: supabase functions deploy mailchimp-sync
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Extract datacenter from Mailchimp API key (format: key-usXX) */
function getDatacenter(apiKey: string): string | null {
  const parts = apiKey.split("-");
  return parts.length >= 2 ? parts[parts.length - 1] : null;
}

/** SSRF protection: only allow *.api.mailchimp.com */
function isAllowedMailchimpHost(dc: string): boolean {
  return /^[a-z]{2}\d{1,2}$/.test(dc);
}

// ─── Sync: Add/update a member in a Mailchimp list ─────────────────────────

async function handleSync(body: {
  api_key: string;
  list_id: string;
  email: string;
  merge_fields?: Record<string, string>;
}) {
  const { api_key, list_id, email, merge_fields } = body;

  if (!api_key || !list_id || !email) {
    return jsonResponse({ error: "Missing api_key, list_id, or email" }, 400);
  }

  const dc = getDatacenter(api_key);
  if (!dc || !isAllowedMailchimpHost(dc)) {
    return jsonResponse({ error: "Invalid Mailchimp API key format" }, 400);
  }

  const mcBody: Record<string, unknown> = {
    email_address: email,
    status: "subscribed",
  };

  if (merge_fields && Object.keys(merge_fields).length > 0) {
    mcBody.merge_fields = merge_fields;
  }

  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${list_id}/members`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `apikey ${api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mcBody),
    signal: AbortSignal.timeout(15000),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    return jsonResponse(
      {
        success: false,
        status: response.status,
        error: responseData.detail || responseData.title || "Mailchimp API error",
      },
      response.status >= 500 ? 502 : 400
    );
  }

  return jsonResponse({ success: true, status: response.status });
}

// ─── Fetch Lists: Get all Mailchimp audience lists ──────────────────────────

async function handleFetchLists(body: { api_key: string }) {
  const { api_key } = body;

  if (!api_key) {
    return jsonResponse({ error: "Missing api_key" }, 400);
  }

  const dc = getDatacenter(api_key);
  if (!dc || !isAllowedMailchimpHost(dc)) {
    return jsonResponse({ error: "Invalid Mailchimp API key format" }, 400);
  }

  const url = `https://${dc}.api.mailchimp.com/3.0/lists?count=100`;

  const response = await fetch(url, {
    headers: {
      Authorization: `apikey ${api_key}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    return jsonResponse(
      {
        success: false,
        error: errData.detail || errData.title || "Mailchimp API error",
      },
      response.status >= 500 ? 502 : 400
    );
  }

  const data = await response.json();
  const lists = (data.lists || []).map(
    (l: { id: string; name: string; stats: { member_count: number } }) => ({
      id: l.id,
      name: l.name,
      member_count: l.stats?.member_count || 0,
    })
  );

  return jsonResponse({ success: true, lists });
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify JWT — only authenticated users can call this function
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  } catch {
    return jsonResponse({ error: "Auth verification failed" }, 401);
  }

  // Route by action
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "sync":
        return await handleSync(body);
      case "fetch_lists":
        return await handleFetchLists(body);
      default:
        return jsonResponse({ error: `Unknown action: ${action}. Use 'sync' or 'fetch_lists'.` }, 400);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message, success: false }, 500);
  }
});
