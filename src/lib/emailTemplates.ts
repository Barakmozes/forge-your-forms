// ============================================
// Email Templates — Type-safe email sending (Agent 8)
// Calls the send-email Supabase Edge Function
// ============================================

import { supabase } from "@/integrations/supabase/client";

export type EmailTemplateName =
  | "welcome"
  | "waitlist_invite"
  | "ticket_confirmation"
  | "detractor_alert"
  | "payment_confirmation"
  | "payment_failed";

interface EmailTemplateVariables {
  welcome: { userName?: string; dashboardUrl?: string };
  waitlist_invite: { formTitle?: string; inviteMessage?: string; ctaUrl?: string };
  ticket_confirmation: { ticketNumber?: string; subject?: string; trackingUrl?: string };
  detractor_alert: { customerEmail?: string; score?: string; feedbackText?: string; dashboardUrl?: string };
  payment_confirmation: { planName?: string; billingDate?: string; manageUrl?: string };
  payment_failed: { updatePaymentUrl?: string };
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail<T extends EmailTemplateName>(
  template: T,
  to: string,
  variables: EmailTemplateVariables[T],
  locale: string = "en"
): Promise<SendEmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to,
        template,
        variables,
        locale,
      },
    });

    if (error) {
      console.error("sendEmail error:", error);
      return { success: false, error: error.message };
    }

    return data as SendEmailResult;
  } catch (err) {
    console.error("sendEmail exception:", err);
    return { success: false, error: "Failed to invoke email function" };
  }
}
