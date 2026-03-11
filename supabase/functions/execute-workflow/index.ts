// ============================================
// Execute Workflow Edge Function (Agent 15)
// Evaluates conditions and executes actions for a triggered workflow.
// Deploy: supabase functions deploy execute-workflow
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAX_EXECUTION_DEPTH = 3;
const MAX_RUNS_PER_HOUR = 100;

interface TriggerConfig {
  type: string;
  formId?: string;
  config: Record<string, unknown>;
}

interface WorkflowCondition {
  id: string;
  type: string;
  field?: string;
  operator: string;
  value: unknown;
}

interface WorkflowAction {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface WorkflowStep {
  id: string;
  type: "condition" | "action";
  config: WorkflowCondition | WorkflowAction;
}

interface StepResult {
  stepId: string;
  status: "success" | "skipped" | "failed";
  result?: string;
  error?: string;
}

// --- Condition evaluation ---

function evaluateCondition(
  condition: WorkflowCondition,
  triggerData: Record<string, unknown>
): boolean {
  const fieldValue = triggerData[condition.field || ""];

  switch (condition.type) {
    case "field_equals":
      return String(fieldValue) === String(condition.value);

    case "score_below":
      return Number(fieldValue) < Number(condition.value);

    case "score_above":
      return Number(fieldValue) > Number(condition.value);

    case "status_is":
      return String(fieldValue) === String(condition.value);

    case "priority_is":
      return String(fieldValue) === String(condition.value);

    case "count_exceeds":
      return Number(fieldValue) > Number(condition.value);

    default:
      console.warn(`Unknown condition type: ${condition.type}`);
      return true;
  }
}

// --- Action execution ---

async function executeAction(
  action: WorkflowAction,
  triggerData: Record<string, unknown>,
  workspaceId: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ success: boolean; result?: string; error?: string }> {
  const config = action.config;

  // Replace template variables in config values
  const resolveTemplate = (str: string): string => {
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(triggerData[key] ?? "");
    });
  };

  try {
    switch (action.type) {
      case "send_email": {
        const to = resolveTemplate(String(config.to || ""));
        const template = String(config.template || "detractor_alert");
        const variables: Record<string, string> = {};
        if (config.variables && typeof config.variables === "object") {
          for (const [k, v] of Object.entries(config.variables as Record<string, string>)) {
            variables[k] = resolveTemplate(String(v));
          }
        }
        // Add trigger data as variables
        for (const [k, v] of Object.entries(triggerData)) {
          if (typeof v === "string" || typeof v === "number") {
            variables[k] = String(v);
          }
        }

        const { error } = await supabaseAdmin.functions.invoke("send-email", {
          body: { to, template, variables },
        });
        if (error) return { success: false, error: error.message };
        return { success: true, result: `Email sent to ${to}` };
      }

      case "create_ticket": {
        const formId = String(triggerData.form_id || "");
        const subject = resolveTemplate(String(config.subject || "Auto-created ticket"));
        const description = resolveTemplate(String(config.description || ""));
        const priority = String(config.priority || "medium");

        // Find a support-mode form in the workspace to attach the ticket to
        let targetFormId = formId;
        if (config.targetFormId) {
          targetFormId = String(config.targetFormId);
        } else {
          // Find first active support form in workspace
          const { data: supportForm } = await supabaseAdmin
            .from("forms")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("mode", "support")
            .eq("status", "active")
            .limit(1)
            .single();
          if (supportForm) targetFormId = supportForm.id;
        }

        const { error } = await supabaseAdmin.from("tickets").insert({
          form_id: targetFormId,
          subject,
          description,
          priority,
          submitted_by_email: String(triggerData.respondent_email || triggerData.email || "workflow@formforge.io"),
          submitted_by_name: "Workflow Automation",
        });
        if (error) return { success: false, error: error.message };
        return { success: true, result: `Ticket created: ${subject}` };
      }

      case "slack_message": {
        const message = resolveTemplate(String(config.message || "Workflow notification"));

        // Get Slack webhook URL from workspace integrations
        const { data: forms } = await supabaseAdmin
          .from("forms")
          .select("settings")
          .eq("workspace_id", workspaceId)
          .limit(10);

        let webhookUrl = "";
        if (forms) {
          for (const form of forms) {
            const settings = form.settings as Record<string, unknown> | null;
            const integrations = settings?.integrations as Record<string, unknown> | undefined;
            const slack = integrations?.slack as { enabled?: boolean; webhook_url?: string } | undefined;
            if (slack?.enabled && slack?.webhook_url) {
              webhookUrl = slack.webhook_url;
              break;
            }
          }
        }

        if (!webhookUrl) {
          return { success: false, error: "No Slack webhook configured" };
        }

        const { error } = await supabaseAdmin.functions.invoke("slack-notify", {
          body: {
            webhook_url: webhookUrl,
            event_type: "workflow.action",
            form_title: "Workflow",
            data: { message, ...triggerData },
          },
        });
        if (error) return { success: false, error: error.message };
        return { success: true, result: "Slack message sent" };
      }

      case "fire_webhook": {
        const { error } = await supabaseAdmin.functions.invoke("dispatch-webhook", {
          body: {
            workspace_id: workspaceId,
            event_type: String(config.eventType || "workflow.action"),
            payload: { trigger_data: triggerData, workflow_action: config },
          },
        });
        if (error) return { success: false, error: error.message };
        return { success: true, result: "Webhook fired" };
      }

      case "change_status": {
        const newStatus = String(config.status || "");
        const ticketId = String(triggerData.ticket_id || "");
        if (!ticketId || !newStatus) {
          return { success: false, error: "Missing ticket_id or status" };
        }
        const { error } = await supabaseAdmin
          .from("tickets")
          .update({ status: newStatus })
          .eq("id", ticketId);
        if (error) return { success: false, error: error.message };
        return { success: true, result: `Status changed to ${newStatus}` };
      }

      case "add_tag": {
        const tagName = String(config.tagName || "");
        const ticketId = String(triggerData.ticket_id || "");
        if (!ticketId || !tagName) {
          return { success: false, error: "Missing ticket_id or tagName" };
        }

        // Find or create tag
        let tagId: string | null = null;
        const { data: existingTag } = await supabaseAdmin
          .from("tags")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("name", tagName)
          .single();

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag } = await supabaseAdmin
            .from("tags")
            .insert({ workspace_id: workspaceId, name: tagName })
            .select("id")
            .single();
          if (newTag) tagId = newTag.id;
        }

        if (!tagId) return { success: false, error: "Could not find or create tag" };

        const { error } = await supabaseAdmin
          .from("ticket_tags")
          .upsert({ ticket_id: ticketId, tag_id: tagId });
        if (error) return { success: false, error: error.message };
        return { success: true, result: `Tag "${tagName}" added` };
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
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

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let body: {
    workflow_id: string;
    workspace_id: string;
    trigger_type: string;
    trigger_data: Record<string, unknown>;
    execution_depth?: number;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { workflow_id, workspace_id, trigger_type, trigger_data, execution_depth = 0 } = body;

  // Circular trigger prevention
  if (execution_depth >= MAX_EXECUTION_DEPTH) {
    console.warn(`Workflow ${workflow_id}: max execution depth reached (${MAX_EXECUTION_DEPTH})`);
    return new Response(
      JSON.stringify({ success: false, error: "Max execution depth reached" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limiting: check runs in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("workflow_runs")
    .select("id", { count: "exact", head: true })
    .gte("started_at", oneHourAgo)
    .in("workflow_id", [workflow_id]);

  if ((count ?? 0) >= MAX_RUNS_PER_HOUR) {
    console.warn(`Workflow ${workflow_id}: rate limit exceeded (${MAX_RUNS_PER_HOUR}/hr)`);
    return new Response(
      JSON.stringify({ success: false, error: "Rate limit exceeded" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch workflow
  const { data: workflow, error: fetchError } = await supabaseAdmin
    .from("workflows")
    .select("*")
    .eq("id", workflow_id)
    .eq("active", true)
    .single();

  if (fetchError || !workflow) {
    return new Response(
      JSON.stringify({ success: false, error: "Workflow not found or inactive" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create run record
  const { data: run } = await supabaseAdmin
    .from("workflow_runs")
    .insert({
      workflow_id,
      trigger_event: { type: trigger_type, data: trigger_data },
      status: "running",
    })
    .select("id")
    .single();

  const runId = run?.id;
  const stepsExecuted: StepResult[] = [];
  let runStatus: "completed" | "failed" = "completed";
  let runError: string | null = null;

  try {
    const steps = (workflow.steps as WorkflowStep[]) || [];

    for (const step of steps) {
      if (step.type === "condition") {
        const condition = step.config as WorkflowCondition;
        const passed = evaluateCondition(condition, trigger_data);
        stepsExecuted.push({
          stepId: step.id,
          status: passed ? "success" : "skipped",
          result: passed ? "Condition met" : "Condition not met — stopping",
        });
        if (!passed) {
          // Condition failed — skip remaining steps
          break;
        }
      } else if (step.type === "action") {
        const action = step.config as WorkflowAction;
        const result = await executeAction(action, trigger_data, workspace_id, supabaseAdmin);
        stepsExecuted.push({
          stepId: step.id,
          status: result.success ? "success" : "failed",
          result: result.result,
          error: result.error,
        });
        if (!result.success) {
          runStatus = "failed";
          runError = result.error || "Action failed";
          // Continue executing remaining actions despite failure
        }
      }
    }
  } catch (err) {
    runStatus = "failed";
    runError = String(err);
  }

  // Update run record
  if (runId) {
    await supabaseAdmin
      .from("workflow_runs")
      .update({
        steps_executed: stepsExecuted,
        status: runStatus,
        error: runError,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
  }

  // Update workflow stats
  await supabaseAdmin
    .from("workflows")
    .update({
      last_run_at: new Date().toISOString(),
      run_count: (workflow.run_count || 0) + 1,
    })
    .eq("id", workflow_id);

  console.log(`Workflow ${workflow_id} executed: ${runStatus}, steps: ${stepsExecuted.length}`);

  return new Response(
    JSON.stringify({
      success: runStatus === "completed",
      run_id: runId,
      status: runStatus,
      steps_executed: stepsExecuted.length,
      error: runError,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
