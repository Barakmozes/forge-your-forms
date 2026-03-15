export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activation_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cache: {
        Row: {
          cache_type: string
          created_at: string
          expires_at: string
          id: string
          input_hash: string
          output: Json
          workspace_id: string
        }
        Insert: {
          cache_type: string
          created_at?: string
          expires_at?: string
          id?: string
          input_hash: string
          output?: Json
          workspace_id: string
        }
        Update: {
          cache_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          input_hash?: string
          output?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      canned_responses: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          title: string
          workspace_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          title: string
          workspace_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["feedback_alert_type"]
          created_at: string
          form_id: string
          id: string
          message: string | null
          read: boolean
          response_id: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["feedback_alert_type"]
          created_at?: string
          form_id: string
          id?: string
          message?: string | null
          read?: boolean
          response_id: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["feedback_alert_type"]
          created_at?: string
          form_id?: string
          id?: string
          message?: string | null
          read?: boolean
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_alerts_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_alerts_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "feedback_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          category: string | null
          created_at: string
          custom_answers: Json | null
          flagged: boolean
          follow_up: string | null
          form_id: string
          id: string
          nps_score: number | null
          respondent_email: string | null
          respondent_name: string | null
          sentiment: Database["public"]["Enums"]["feedback_sentiment"] | null
          submission_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          custom_answers?: Json | null
          flagged?: boolean
          follow_up?: string | null
          form_id: string
          id?: string
          nps_score?: number | null
          respondent_email?: string | null
          respondent_name?: string | null
          sentiment?: Database["public"]["Enums"]["feedback_sentiment"] | null
          submission_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          custom_answers?: Json | null
          flagged?: boolean
          follow_up?: string | null
          form_id?: string
          id?: string
          nps_score?: number | null
          respondent_email?: string | null
          respondent_name?: string | null
          sentiment?: Database["public"]["Enums"]["feedback_sentiment"] | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          branding: Json | null
          created_at: string
          created_by: string
          description: string | null
          fields: Json | null
          id: string
          mode: Database["public"]["Enums"]["form_mode"]
          settings: Json | null
          status: Database["public"]["Enums"]["form_status"]
          submission_count: number
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          branding?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          fields?: Json | null
          id?: string
          mode?: Database["public"]["Enums"]["form_mode"]
          settings?: Json | null
          status?: Database["public"]["Enums"]["form_status"]
          submission_count?: number
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          branding?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          fields?: Json | null
          id?: string
          mode?: Database["public"]["Enums"]["form_mode"]
          settings?: Json | null
          status?: Database["public"]["Enums"]["form_status"]
          submission_count?: number
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          consent_given_at: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          consent_given_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          consent_given_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          data: Json | null
          form_id: string
          id: string
          metadata: Json | null
          status: string | null
          submitted_at: string
          submitted_by_email: string | null
          submitted_by_name: string | null
        }
        Insert: {
          data?: Json | null
          form_id: string
          id?: string
          metadata?: Json | null
          status?: string | null
          submitted_at?: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
        }
        Update: {
          data?: Json | null
          form_id?: string
          id?: string
          metadata?: Json | null
          status?: string | null
          submitted_at?: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          branding: Json | null
          category: string
          created_at: string | null
          description: string | null
          fields: Json
          id: string
          industry: string | null
          is_active: boolean | null
          is_featured: boolean | null
          mode: string
          settings: Json | null
          slug: string
          thumbnail_url: string | null
          title: string
          use_count: number | null
        }
        Insert: {
          branding?: Json | null
          category: string
          created_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          mode: string
          settings?: Json | null
          slug: string
          thumbnail_url?: string | null
          title: string
          use_count?: number | null
        }
        Update: {
          branding?: Json | null
          category?: string
          created_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          mode?: string
          settings?: Json | null
          slug?: string
          thumbnail_url?: string | null
          title?: string
          use_count?: number | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_email: string | null
          sender_name: string | null
          sender_type: Database["public"]["Enums"]["ticket_sender_type"]
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_email?: string | null
          sender_name?: string | null
          sender_type?: Database["public"]["Enums"]["ticket_sender_type"]
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_email?: string | null
          sender_name?: string | null
          sender_type?: Database["public"]["Enums"]["ticket_sender_type"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          tag_id: string
          ticket_id: string
        }
        Insert: {
          tag_id: string
          ticket_id: string
        }
        Update: {
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string | null
          first_response_at: string | null
          form_id: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          submitted_by_email: string | null
          submitted_by_name: string | null
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          first_response_at?: string | null
          form_id: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          first_response_at?: string | null
          form_id?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          created_at: string
          email: string
          form_id: string
          id: string
          metadata: Json | null
          name: string | null
          position: number
          referral_code: string
          referral_count: number
          referred_by: string | null
          status: Database["public"]["Enums"]["waitlist_entry_status"]
        }
        Insert: {
          created_at?: string
          email: string
          form_id: string
          id?: string
          metadata?: Json | null
          name?: string | null
          position?: number
          referral_code: string
          referral_count?: number
          referred_by?: string | null
          status?: Database["public"]["Enums"]["waitlist_entry_status"]
        }
        Update: {
          created_at?: string
          email?: string
          form_id?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          position?: number
          referral_code?: string
          referral_count?: number
          referred_by?: string | null
          status?: Database["public"]["Enums"]["waitlist_entry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_invites: {
        Row: {
          entry_id: string
          form_id: string
          id: string
          invited_at: string
          message: string | null
        }
        Insert: {
          entry_id: string
          form_id: string
          id?: string
          invited_at?: string
          message?: string | null
        }
        Update: {
          entry_id?: string
          form_id?: string
          id?: string
          invited_at?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_invites_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_invites_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_attempt_at: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          events: string[]
          id: string
          secret: string
          updated_at: string
          url: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          secret: string
          updated_at?: string
          url: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          secret?: string
          updated_at?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_ticket_number: { Args: { p_form_id: string }; Returns: string }
      get_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      lookup_profile_for_invite:
        | {
            Args: { email_input: string }
            Returns: {
              email: string
              id: string
            }[]
          }
        | {
            Args: { email_input: string; workspace_id_input: string }
            Returns: {
              email: string
              id: string
            }[]
          }
      lookup_profiles_by_ids: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
        }[]
      }
    }
    Enums: {
      feedback_alert_type: "detractor" | "score_drop" | "keyword"
      feedback_sentiment: "promoter" | "passive" | "detractor"
      form_mode: "standard" | "waitlist" | "feedback" | "support"
      form_status: "draft" | "active" | "closed"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_sender_type: "agent" | "customer" | "system"
      ticket_status: "open" | "in_progress" | "waiting" | "resolved" | "closed"
      waitlist_entry_status: "waiting" | "invited" | "joined" | "removed"
      workspace_role: "owner" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      feedback_alert_type: ["detractor", "score_drop", "keyword"],
      feedback_sentiment: ["promoter", "passive", "detractor"],
      form_mode: ["standard", "waitlist", "feedback", "support"],
      form_status: ["draft", "active", "closed"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_sender_type: ["agent", "customer", "system"],
      ticket_status: ["open", "in_progress", "waiting", "resolved", "closed"],
      waitlist_entry_status: ["waiting", "invited", "joined", "removed"],
      workspace_role: ["owner", "editor", "viewer"],
    },
  },
} as const
