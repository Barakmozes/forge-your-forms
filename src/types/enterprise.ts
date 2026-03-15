// ============================================
// Enterprise Types — shared interfaces for enterprise tables (Agent 14)
// NOTE: enterprise_settings and custom_domains are not in the Supabase
// auto-generated types. These interfaces mirror the database schema.
// Run `npx supabase gen types ...` to regenerate types after migrations.
// ============================================

export interface CustomDomain {
  id: string;
  workspace_id: string;
  domain: string;
  verified: boolean;
  verification_token: string;
  ssl_status: "pending" | "active" | "error" | string;
  created_at: string;
  updated_at: string;
}

// Re-export from useEnterprise for centralised reference
export type { EnterpriseSettings } from "@/hooks/useEnterprise";
