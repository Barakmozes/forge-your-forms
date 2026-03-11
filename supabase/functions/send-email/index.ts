// ============================================
// Send Email Edge Function (Agent 8)
// Sends transactional emails via Resend API.
// Deploy: supabase functions deploy send-email
// Secrets: RESEND_API_KEY, FROM_EMAIL
// ============================================

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "FormForge <noreply@formforge.io>";

// --- Template definitions ---

interface TemplateResult {
  subject: string;
  html: string;
}

type TemplateVariables = Record<string, string>;

function getWelcomeTemplate(vars: TemplateVariables, locale: string): TemplateResult {
  const isHe = locale === "he";
  return {
    subject: isHe ? "FormForge-\u05D1\u05E8\u05D5\u05DB\u05D9\u05DD \u05D4\u05D1\u05D0\u05D9\u05DD \u05DC" : "Welcome to FormForge!",
    html: emailLayout(
      isHe ? "he" : "en",
      isHe ? `<h1 style="margin:0 0 16px">\u05E9\u05DC\u05D5\u05DD ${vars.userName || ""},</h1>
        <p>\u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E9\u05DC\u05DA \u05D1-FormForge \u05E0\u05D5\u05E6\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4. \u05D0\u05EA\u05D4 \u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05DC\u05D9\u05E6\u05D5\u05E8 \u05D8\u05E4\u05E1\u05D9\u05DD, \u05E8\u05E9\u05D9\u05DE\u05D5\u05EA \u05D4\u05DE\u05EA\u05E0\u05D4, \u05E1\u05E7\u05E8\u05D9 \u05DE\u05E9\u05D5\u05D1 \u05D5\u05DE\u05E2\u05E8\u05DB\u05EA \u05EA\u05DE\u05D9\u05DB\u05D4.</p>
        ${ctaButton(vars.dashboardUrl || "/", isHe ? "\u05DC\u05DC\u05D5\u05D7 \u05D4\u05D1\u05E7\u05E8\u05D4" : "Go to Dashboard")}`
      : `<h1 style="margin:0 0 16px">Hi ${vars.userName || "there"},</h1>
        <p>Your FormForge account is ready. You can now create forms, waitlists, feedback surveys, and support ticket systems.</p>
        ${ctaButton(vars.dashboardUrl || "/", "Go to Dashboard")}`
    ),
  };
}

function getWaitlistInviteTemplate(vars: TemplateVariables, locale: string): TemplateResult {
  const isHe = locale === "he";
  return {
    subject: isHe
      ? `\u05D4\u05D5\u05D6\u05DE\u05E0\u05EA! ${vars.formTitle || ""}`
      : `You're invited! ${vars.formTitle || ""}`,
    html: emailLayout(
      isHe ? "he" : "en",
      `<h1 style="margin:0 0 16px">${isHe ? "\u05D4\u05D5\u05D6\u05DE\u05E0\u05EA!" : "You're Invited!"}</h1>
       <p>${vars.inviteMessage || (isHe ? "\u05D4\u05D2\u05D9\u05E2 \u05D4\u05EA\u05D5\u05E8 \u05E9\u05DC\u05DA!" : "Your turn has arrived!")}</p>
       ${ctaButton(vars.ctaUrl || "/", isHe ? "\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5 \u05E2\u05DB\u05E9\u05D9\u05D5" : "Join Now")}`
    ),
  };
}

function getTicketConfirmationTemplate(vars: TemplateVariables, locale: string): TemplateResult {
  const isHe = locale === "he";
  return {
    subject: isHe
      ? `\u05E4\u05E0\u05D9\u05D9\u05D4 #${vars.ticketNumber || ""} \u05D4\u05EA\u05E7\u05D1\u05DC\u05D4`
      : `Ticket #${vars.ticketNumber || ""} received`,
    html: emailLayout(
      isHe ? "he" : "en",
      `<h1 style="margin:0 0 16px">${isHe ? "\u05E7\u05D9\u05D1\u05DC\u05E0\u05D5 \u05D0\u05EA \u05D4\u05E4\u05E0\u05D9\u05D9\u05D4 \u05E9\u05DC\u05DA" : "We received your ticket"}</h1>
       <p><strong>${isHe ? "\u05DE\u05E1\u05E4\u05E8 \u05E4\u05E0\u05D9\u05D9\u05D4:" : "Ticket:"}</strong> #${vars.ticketNumber || ""}</p>
       <p><strong>${isHe ? "\u05E0\u05D5\u05E9\u05D0:" : "Subject:"}</strong> ${vars.subject || ""}</p>
       <p>${isHe ? "\u05E0\u05D7\u05D6\u05D5\u05E8 \u05D0\u05DC\u05D9\u05DA \u05D1\u05D4\u05E7\u05D3\u05DD." : "We'll get back to you soon."}</p>
       ${ctaButton(vars.trackingUrl || "/", isHe ? "\u05DE\u05E2\u05E7\u05D1 \u05D0\u05D7\u05E8 \u05D4\u05E4\u05E0\u05D9\u05D9\u05D4" : "Track Your Ticket")}`
    ),
  };
}

function getDetractorAlertTemplate(vars: TemplateVariables, locale: string): TemplateResult {
  const isHe = locale === "he";
  return {
    subject: isHe
      ? `\u05D4\u05EA\u05E8\u05D0\u05D4: ${vars.customerEmail || ""} \u05D3\u05D9\u05E8\u05D2 ${vars.score || ""}`
      : `Detractor Alert: ${vars.customerEmail || ""} scored ${vars.score || ""}`,
    html: emailLayout(
      isHe ? "he" : "en",
      `<h1 style="margin:0 0 16px;color:#dc2626">${isHe ? "\u05D4\u05EA\u05E8\u05D0\u05EA \u05D3\u05D8\u05E8\u05E7\u05D8\u05D5\u05E8" : "Detractor Alert"}</h1>
       <p><strong>${isHe ? "\u05DC\u05E7\u05D5\u05D7:" : "Customer:"}</strong> ${vars.customerEmail || ""}</p>
       <p><strong>${isHe ? "\u05E6\u05D9\u05D5\u05DF NPS:" : "NPS Score:"}</strong> ${vars.score || ""}/10</p>
       ${vars.feedbackText ? `<p><strong>${isHe ? "\u05DE\u05E9\u05D5\u05D1:" : "Feedback:"}</strong> "${vars.feedbackText}"</p>` : ""}
       ${ctaButton(vars.dashboardUrl || "/", isHe ? "\u05E6\u05E4\u05D4 \u05D1\u05DC\u05D5\u05D7 \u05D4\u05D1\u05E7\u05E8\u05D4" : "View in Dashboard")}`
    ),
  };
}

function getPaymentConfirmationTemplate(vars: TemplateVariables, locale: string): TemplateResult {
  const isHe = locale === "he";
  return {
    subject: isHe
      ? `\u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05D5\u05E9\u05E8 \u2014 \u05EA\u05DB\u05E0\u05D9\u05EA ${vars.planName || ""} \u05E4\u05E2\u05D9\u05DC\u05D4`
      : `Payment confirmed \u2014 ${vars.planName || ""} plan active`,
    html: emailLayout(
      isHe ? "he" : "en",
      `<h1 style="margin:0 0 16px">${isHe ? "\u05EA\u05E9\u05DC\u05D5\u05DD \u05D0\u05D5\u05E9\u05E8!" : "Payment Confirmed!"}</h1>
       <p><strong>${isHe ? "\u05EA\u05DB\u05E0\u05D9\u05EA:" : "Plan:"}</strong> ${vars.planName || ""}</p>
       ${vars.billingDate ? `<p><strong>${isHe ? "\u05D7\u05D9\u05D3\u05D5\u05E9 \u05D1\u05D0:" : "Next billing:"}</strong> ${vars.billingDate}</p>` : ""}
       ${ctaButton(vars.manageUrl || "/settings?tab=billing", isHe ? "\u05E0\u05D4\u05DC \u05DE\u05E0\u05D5\u05D9" : "Manage Subscription")}`
    ),
  };
}

function getPaymentFailedTemplate(vars: TemplateVariables, locale: string): TemplateResult {
  const isHe = locale === "he";
  return {
    subject: isHe
      ? "\u05EA\u05E9\u05DC\u05D5\u05DD \u05E0\u05DB\u05E9\u05DC \u2014 \u05E0\u05D3\u05E8\u05E9\u05EA \u05E4\u05E2\u05D5\u05DC\u05D4"
      : "Payment failed \u2014 action required",
    html: emailLayout(
      isHe ? "he" : "en",
      `<h1 style="margin:0 0 16px;color:#dc2626">${isHe ? "\u05EA\u05E9\u05DC\u05D5\u05DD \u05E0\u05DB\u05E9\u05DC" : "Payment Failed"}</h1>
       <p>${isHe
        ? "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D7\u05D9\u05D9\u05D1 \u05D0\u05EA \u05D0\u05DE\u05E6\u05E2\u05D9 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E9\u05DC\u05DA. \u05D0\u05E0\u05D0 \u05E2\u05D3\u05DB\u05E0\u05D5 \u05D0\u05EA \u05E4\u05E8\u05D8\u05D9 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05DB\u05D3\u05D9 \u05DC\u05DE\u05E0\u05D5\u05E2 \u05D4\u05E4\u05E8\u05E2\u05D4 \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA."
        : "We couldn't process your payment. Please update your payment method to avoid service interruption."}</p>
       ${ctaButton(vars.updatePaymentUrl || "/settings?tab=billing", isHe ? "\u05E2\u05D3\u05DB\u05D5\u05DF \u05D0\u05DE\u05E6\u05E2\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD" : "Update Payment Method")}`
    ),
  };
}

// --- Template registry ---

const TEMPLATES: Record<string, (vars: TemplateVariables, locale: string) => TemplateResult> = {
  welcome: getWelcomeTemplate,
  waitlist_invite: getWaitlistInviteTemplate,
  ticket_confirmation: getTicketConfirmationTemplate,
  detractor_alert: getDetractorAlertTemplate,
  payment_confirmation: getPaymentConfirmationTemplate,
  payment_failed: getPaymentFailedTemplate,
};

// --- HTML helpers ---

function emailLayout(lang: string, content: string): string {
  const dir = lang === "he" ? "rtl" : "ltr";
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="background:linear-gradient(135deg,#059669,#10b981);padding:24px 32px;text-align:center">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px">FormForge</span>
        </td></tr>
        <tr><td style="padding:32px;color:#18181b;font-size:15px;line-height:1.6;direction:${dir}">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 32px 24px;text-align:center;color:#71717a;font-size:12px;border-top:1px solid #e4e4e7">
          &copy; ${new Date().getFullYear()} FormForge. ${lang === "he" ? "\u05DB\u05DC \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA." : "All rights reserved."}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td>
    <a href="${url}" style="display:inline-block;padding:12px 28px;background:#059669;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${label}</a>
  </td></tr></table>`;
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { to: string; template: string; variables?: TemplateVariables; locale?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { to, template, variables = {}, locale = "en" } = body;

  if (!to || !template) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing required fields: to, template" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const templateFn = TEMPLATES[template];
  if (!templateFn) {
    return new Response(
      JSON.stringify({ success: false, error: `Unknown template: ${template}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { subject, html } = templateFn(variables, locale);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data.message || "Failed to send email" }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Email sent: template=${template}, to=${to}, id=${data.id}`);
    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Email send error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
