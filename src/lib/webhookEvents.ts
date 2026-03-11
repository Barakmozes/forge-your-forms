import { supabase } from "@/integrations/supabase/client";

// ─── Webhook Event Types ────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = {
  SUBMISSION_CREATED: "form.submission_created",
  WAITLIST_SIGNUP: "waitlist.entry_created",
  FEEDBACK_RESPONSE: "feedback.response_created",
  TICKET_CREATED: "support.ticket_created",
  TICKET_RESOLVED: "support.ticket_resolved",
  FORM_CREATED: "form.created",
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  [WEBHOOK_EVENTS.SUBMISSION_CREATED]: "webhooks.eventSubmission",
  [WEBHOOK_EVENTS.WAITLIST_SIGNUP]: "webhooks.eventWaitlist",
  [WEBHOOK_EVENTS.FEEDBACK_RESPONSE]: "webhooks.eventFeedback",
  [WEBHOOK_EVENTS.TICKET_CREATED]: "webhooks.eventTicket",
  [WEBHOOK_EVENTS.TICKET_RESOLVED]: "webhooks.eventTicketResolved",
  [WEBHOOK_EVENTS.FORM_CREATED]: "webhooks.eventFormCreated",
};

export const ALL_WEBHOOK_EVENTS = Object.values(WEBHOOK_EVENTS);

// ─── Payload Builders ───────────────────────────────────────────────────────

export function buildSubmissionPayload(formId: string, submissionId: string, data: Record<string, unknown>) {
  return {
    form_id: formId,
    submission_id: submissionId,
    data,
  };
}

export function buildWaitlistPayload(formId: string, entryId: string, email: string, position: number) {
  return {
    form_id: formId,
    entry_id: entryId,
    email,
    position,
  };
}

export function buildFeedbackPayload(formId: string, responseId: string, npsScore: number, sentiment: string) {
  return {
    form_id: formId,
    response_id: responseId,
    nps_score: npsScore,
    sentiment,
  };
}

export function buildTicketPayload(formId: string, ticketId: string, ticketNumber: string, subject: string) {
  return {
    form_id: formId,
    ticket_id: ticketId,
    ticket_number: ticketNumber,
    subject,
  };
}

export function buildFormCreatedPayload(formId: string, title: string, mode: string) {
  return {
    form_id: formId,
    title,
    mode,
  };
}

// ─── Dispatch Function ──────────────────────────────────────────────────────

/**
 * Dispatches a webhook event. This is a fire-and-forget operation.
 * It queries active webhooks for the workspace and records deliveries.
 *
 * For public pages (no auth), we look up the workspace via the form_id
 * and use a database function to dispatch.
 *
 * For authenticated pages, workspace_id is provided directly.
 */
export async function dispatchWebhook(
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
  options: { workspaceId?: string; formId?: string }
): Promise<void> {
  try {
    let workspaceId = options.workspaceId;

    // If no workspace_id, look it up from form_id
    if (!workspaceId && options.formId) {
      const { data: form } = await supabase
        .from("forms")
        .select("workspace_id")
        .eq("id", options.formId)
        .single();
      workspaceId = form?.workspace_id;
    }

    if (!workspaceId) return;

    // Fetch active webhooks that listen for this event type
    const { data: webhooks } = await supabase
      .from("webhooks")
      .select("id, url, secret, events")
      .eq("workspace_id", workspaceId)
      .eq("active", true);

    if (!webhooks || webhooks.length === 0) return;

    // Filter webhooks that subscribe to this event
    const matchingWebhooks = webhooks.filter(
      (wh) => Array.isArray(wh.events) && wh.events.includes(eventType)
    );

    if (matchingWebhooks.length === 0) return;

    // For each matching webhook, create a delivery record
    // The actual HTTP dispatch is handled server-side via Edge Function
    const deliveries = matchingWebhooks.map((wh) => ({
      webhook_id: wh.id,
      event_type: eventType,
      payload: {
        event: eventType,
        created_at: new Date().toISOString(),
        workspace_id: workspaceId,
        data: payload,
      },
    }));

    // Insert delivery records — the Edge Function cron/trigger picks them up
    await supabase.from("webhook_deliveries").insert(deliveries);

    // Fire-and-forget: invoke the dispatch Edge Function
    supabase.functions.invoke("dispatch-webhook", {
      body: {
        workspace_id: workspaceId,
        event_type: eventType,
        payload,
        delivery_ids: deliveries.map(() => crypto.randomUUID()),
      },
    }).catch(() => {
      // Silently fail — deliveries are recorded for retry
    });
  } catch {
    // Webhook dispatch should never block the main flow
  }
}
