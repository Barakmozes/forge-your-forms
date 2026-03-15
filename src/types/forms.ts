/**
 * Shared domain types for FormForge.
 *
 * These interfaces provide application-level types that may extend or simplify
 * the auto-generated Supabase types. Use these in components and hooks.
 */
import type { Json } from "@/integrations/supabase/types";
import type {
  FormMode,
  FormStatus,
  WorkspaceRole,
  FeedbackSentiment,
  TicketStatus,
  TicketPriority,
  TicketSenderType,
  WaitlistEntryStatus,
} from "@/types/database";
import type { FieldCondition } from "@/components/builder/ConditionalLogic";

// Re-export enums for convenience
export type { FormMode, FormStatus, WorkspaceRole };

// ── Form Field Types ───────────────────────────────────────────

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "select"
  | "multi_select"
  | "checkbox"
  | "radio"
  | "file_upload"
  | "section_header"
  | "paragraph_text";

export interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  /** @deprecated phonePattern is stored but NOT used in validation — safe hardcoded regex is used instead (ReDoS prevention) */
  phonePattern?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  pattern?: string;
  customMessage?: string;
}

/** Canonical FormField definition — single source of truth for all form field data. */
export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: string[];
  validation: FormFieldValidation;
  condition?: FieldCondition;
}

// ── Core Models ───────────────────────────────────────────────

export interface Form {
  id: string;
  title: string;
  description: string | null;
  fields: Json | null;
  settings: Json | null;
  status: FormStatus;
  mode: FormMode;
  branding: Json | null;
  submission_count: number;
  created_by: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  form_id: string;
  data: Json | null;
  submitted_by_email: string | null;
  submitted_by_name: string | null;
  metadata: Json | null;
  status: string | null;
  submitted_at: string;
}

// ── Waitlist ──────────────────────────────────────────────────

export interface WaitlistEntry {
  id: string;
  form_id: string;
  email: string;
  name: string | null;
  referral_code: string;
  referred_by: string | null;
  position: number;
  referral_count: number;
  status: WaitlistEntryStatus;
  metadata: Json | null;
  created_at: string;
}

// ── Feedback ──────────────────────────────────────────────────

export interface FeedbackResponse {
  id: string;
  form_id: string;
  submission_id: string | null;
  respondent_email: string | null;
  respondent_name: string | null;
  nps_score: number | null;
  category: string | null;
  sentiment: FeedbackSentiment | null;
  follow_up: string | null;
  custom_answers: Json | null;
  flagged: boolean;
  created_at: string;
}

// ── Support ───────────────────────────────────────────────────

export interface Ticket {
  id: string;
  form_id: string;
  ticket_number: string;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  assigned_to: string | null;
  submitted_by_email: string | null;
  submitted_by_name: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: TicketSenderType;
  sender_name: string | null;
  sender_email: string | null;
  message: string;
  is_internal: boolean;
  created_at: string;
}
