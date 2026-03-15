// ============================================
// delete-account Edge Function
// Agent 02 — Database Security (RLS & Policies)
//
// Deletes a user account and all associated data.
// Requires authentication. Uses service_role to:
//   1. Delete owned workspaces (CASCADE removes forms, submissions, etc.)
//   2. Remove workspace memberships
//   3. Delete notifications
//   4. Delete profile
//   5. Delete auth.users record via admin API
//
// This resolves the GDPR compliance gap where auth.users
// was never deleted during account deletion.
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleCors,
  jsonError,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  authenticateUser,
  supabase,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} from "../_shared/supabase.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only POST allowed
  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  // Authenticate the user
  const user = await authenticateUser(req);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const userId = user.id;

  console.log(`delete-account: Starting deletion for user ${userId}`);

  try {
    // Step 1: Delete owned workspaces
    // CASCADE on workspaces → forms → submissions, waitlist_entries, feedback_responses,
    // tickets (+ ticket_messages, ticket_tags), etc.
    // CASCADE on workspaces → workspace_members
    // CASCADE on workspaces → webhooks, api_keys, canned_responses, tags, workflows, etc.
    const { error: workspaceError } = await supabase
      .from("workspaces")
      .delete()
      .eq("owner_id", userId);

    if (workspaceError) {
      console.error("delete-account: workspace deletion failed:", workspaceError.message);
      return jsonError(`Failed to delete workspaces: ${workspaceError.message}`, 500);
    }
    console.log(`delete-account: Workspaces deleted for user ${userId}`);

    // Step 2: Remove workspace memberships (non-owned workspaces the user is a member of)
    const { error: memberError } = await supabase
      .from("workspace_members")
      .delete()
      .eq("user_id", userId);

    if (memberError) {
      console.error("delete-account: membership deletion failed:", memberError.message);
      return jsonError(`Failed to remove workspace memberships: ${memberError.message}`, 500);
    }
    console.log(`delete-account: Workspace memberships removed for user ${userId}`);

    // Step 3: Delete notifications
    const { error: notifError } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (notifError) {
      console.error("delete-account: notification deletion failed:", notifError.message);
      return jsonError(`Failed to delete notifications: ${notifError.message}`, 500);
    }
    console.log(`delete-account: Notifications deleted for user ${userId}`);

    // Step 4: Delete activation events
    const { error: activationError } = await supabase
      .from("activation_events")
      .delete()
      .eq("user_id", userId);

    if (activationError) {
      // Non-fatal: activation_events may not exist for all users
      console.warn("delete-account: activation_events deletion warning:", activationError.message);
    }

    // Step 5: Delete profile (CASCADE not needed; profiles.id = auth.users.id)
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("delete-account: profile deletion failed:", profileError.message);
      return jsonError(`Failed to delete profile: ${profileError.message}`, 500);
    }
    console.log(`delete-account: Profile deleted for user ${userId}`);

    // Step 6: Delete auth.users record using admin API (service_role required)
    // This is the step that was previously missing — the user could still authenticate
    // after deletion because their auth record persisted.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("delete-account: auth user deletion failed:", authError.message);
      return jsonError(`Failed to delete auth user: ${authError.message}`, 500);
    }
    console.log(`delete-account: Auth user deleted for user ${userId}`);

    return jsonResponse({ success: true, message: "Account deleted successfully" });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("delete-account: unexpected error:", message);
    return jsonError(`Unexpected error: ${message}`, 500);
  }
});
