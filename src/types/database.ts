/**
 * Re-exports of auto-generated Supabase types with cleaner naming.
 *
 * Import from here instead of "@/integrations/supabase/types" for convenience.
 * The auto-generated file is the source of truth — this file just provides aliases.
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "@/integrations/supabase/types";

export { Constants } from "@/integrations/supabase/types";

import type { Database } from "@/integrations/supabase/types";

// ── Enum aliases ──────────────────────────────────────────────
export type FormMode = Database["public"]["Enums"]["form_mode"];
export type FormStatus = Database["public"]["Enums"]["form_status"];
export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];
export type FeedbackSentiment = Database["public"]["Enums"]["feedback_sentiment"];
export type FeedbackAlertType = Database["public"]["Enums"]["feedback_alert_type"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketPriority = Database["public"]["Enums"]["ticket_priority"];
export type TicketSenderType = Database["public"]["Enums"]["ticket_sender_type"];
export type WaitlistEntryStatus = Database["public"]["Enums"]["waitlist_entry_status"];

// ── Row type aliases ──────────────────────────────────────────
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMemberRow = Database["public"]["Tables"]["workspace_members"]["Row"];
export type FormRow = Database["public"]["Tables"]["forms"]["Row"];
export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type WaitlistEntryRow = Database["public"]["Tables"]["waitlist_entries"]["Row"];
export type WaitlistInviteRow = Database["public"]["Tables"]["waitlist_invites"]["Row"];
export type FeedbackResponseRow = Database["public"]["Tables"]["feedback_responses"]["Row"];
export type FeedbackAlertRow = Database["public"]["Tables"]["feedback_alerts"]["Row"];
export type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
export type TicketMessageRow = Database["public"]["Tables"]["ticket_messages"]["Row"];
export type CannedResponseRow = Database["public"]["Tables"]["canned_responses"]["Row"];
export type TagRow = Database["public"]["Tables"]["tags"]["Row"];
