// ============================================
// Workflow Engine — Type definitions, validation, and dispatch
// Agent 15: Visual Workflow Builder
// ============================================

import { supabase } from "@/integrations/supabase/client";

// === Trigger Types ===

export const TRIGGER_TYPES = {
  FORM_SUBMITTED: "form_submitted",
  NPS_BELOW_THRESHOLD: "nps_below_threshold",
  TICKET_CREATED: "ticket_created",
  WAITLIST_MILESTONE: "waitlist_milestone",
  TICKET_RESOLVED: "ticket_resolved",
  DETRACTOR_ALERT: "detractor_alert",
} as const;

export type TriggerType = (typeof TRIGGER_TYPES)[keyof typeof TRIGGER_TYPES];

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  form_submitted: "Form Submitted",
  nps_below_threshold: "NPS Below Threshold",
  ticket_created: "Ticket Created",
  waitlist_milestone: "Waitlist Milestone",
  ticket_resolved: "Ticket Resolved",
  detractor_alert: "Detractor Alert",
};

export const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  form_submitted: "Fires when a form submission is received",
  nps_below_threshold: "Fires when an NPS score falls below a threshold",
  ticket_created: "Fires when a new support ticket is created",
  waitlist_milestone: "Fires when waitlist reaches a milestone count",
  ticket_resolved: "Fires when a support ticket is resolved",
  detractor_alert: "Fires when a detractor (NPS 0-6) is detected",
};

// === Condition Types ===

export const CONDITION_TYPES = {
  FIELD_EQUALS: "field_equals",
  SCORE_BELOW: "score_below",
  SCORE_ABOVE: "score_above",
  STATUS_IS: "status_is",
  PRIORITY_IS: "priority_is",
  COUNT_EXCEEDS: "count_exceeds",
} as const;

export type ConditionType = (typeof CONDITION_TYPES)[keyof typeof CONDITION_TYPES];

export const CONDITION_LABELS: Record<ConditionType, string> = {
  field_equals: "Field Equals",
  score_below: "Score Below",
  score_above: "Score Above",
  status_is: "Status Is",
  priority_is: "Priority Is",
  count_exceeds: "Count Exceeds",
};

// === Action Types ===

export const ACTION_TYPES = {
  SEND_EMAIL: "send_email",
  CREATE_TICKET: "create_ticket",
  SLACK_MESSAGE: "slack_message",
  FIRE_WEBHOOK: "fire_webhook",
  CHANGE_STATUS: "change_status",
  ADD_TAG: "add_tag",
} as const;

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

export const ACTION_LABELS: Record<ActionType, string> = {
  send_email: "Send Email",
  create_ticket: "Create Support Ticket",
  slack_message: "Send Slack Message",
  fire_webhook: "Fire Webhook",
  change_status: "Change Status",
  add_tag: "Add Tag",
};

export const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  send_email: "Send a transactional email via the email service",
  create_ticket: "Create a new support ticket automatically",
  slack_message: "Send a notification to a Slack channel",
  fire_webhook: "Trigger a configured webhook endpoint",
  change_status: "Change the status of a ticket or entry",
  add_tag: "Add a tag to the associated ticket",
};

// === Interfaces ===

export interface WorkflowTriggerConfig {
  type: TriggerType;
  formId?: string;
  config: Record<string, unknown>;
}

export interface WorkflowCondition {
  id: string;
  type: ConditionType;
  field?: string;
  operator: string;
  value: unknown;
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  config: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  type: "condition" | "action";
  config: WorkflowCondition | WorkflowAction;
  position: { x: number; y: number };
}

export interface Workflow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  trigger_config: WorkflowTriggerConfig;
  steps: WorkflowStep[];
  active: boolean;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  trigger_event: Record<string, unknown> | null;
  steps_executed: Array<{ stepId: string; status: string; result?: string; error?: string }>;
  status: "running" | "completed" | "failed";
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

// === Validation ===

export function validateWorkflow(
  name: string,
  triggerConfig: WorkflowTriggerConfig,
  steps: WorkflowStep[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!name.trim()) {
    errors.push("Workflow name is required");
  }

  if (!triggerConfig.type) {
    errors.push("Trigger type is required");
  }

  if (!Object.values(TRIGGER_TYPES).includes(triggerConfig.type)) {
    errors.push(`Invalid trigger type: ${triggerConfig.type}`);
  }

  if (steps.length === 0) {
    errors.push("At least one action step is required");
  }

  for (const step of steps) {
    if (step.type === "condition") {
      const condition = step.config as WorkflowCondition;
      if (!condition.type) {
        errors.push(`Condition step ${step.id} missing type`);
      }
    } else if (step.type === "action") {
      const action = step.config as WorkflowAction;
      if (!action.type) {
        errors.push(`Action step ${step.id} missing type`);
      }
      if (!Object.values(ACTION_TYPES).includes(action.type)) {
        errors.push(`Invalid action type: ${action.type}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// === Serialization ===

export function stepsToJson(steps: WorkflowStep[]): unknown[] {
  return steps.map((step) => ({
    id: step.id,
    type: step.type,
    config: step.config,
    position: step.position,
  }));
}

export function jsonToSteps(json: unknown[]): WorkflowStep[] {
  if (!Array.isArray(json)) return [];
  return json.map((item: Record<string, unknown>) => ({
    id: (item.id as string) || crypto.randomUUID(),
    type: (item.type as "condition" | "action") || "action",
    config: (item.config as WorkflowCondition | WorkflowAction) || { id: "", type: "send_email", config: {} },
    position: (item.position as { x: number; y: number }) || { x: 0, y: 0 },
  }));
}

// === Dispatch ===

export async function dispatchWorkflowTrigger(
  formId: string,
  triggerType: TriggerType,
  triggerData: Record<string, unknown>
): Promise<void> {
  try {
    // Look up workspace_id from form
    const { data: form } = await supabase
      .from("forms")
      .select("workspace_id")
      .eq("id", formId)
      .single();

    if (!form) return;

    const workspaceId = form.workspace_id;

    // Find active workflows matching this trigger type and workspace
    const { data: workflows } = await supabase
      .from("workflows")
      .select("id, trigger_config, steps")
      .eq("workspace_id", workspaceId)
      .eq("active", true);

    if (!workflows || workflows.length === 0) return;

    const matchingWorkflows = workflows.filter((w) => {
      const config = w.trigger_config as WorkflowTriggerConfig;
      if (config.type !== triggerType) return false;
      // If trigger is scoped to a specific form, check it
      if (config.formId && config.formId !== formId) return false;
      return true;
    });

    if (matchingWorkflows.length === 0) return;

    // Fire-and-forget: invoke edge function for each matching workflow
    for (const workflow of matchingWorkflows) {
      supabase.functions
        .invoke("execute-workflow", {
          body: {
            workflow_id: workflow.id,
            workspace_id: workspaceId,
            trigger_type: triggerType,
            trigger_data: { ...triggerData, form_id: formId },
            execution_depth: 0,
          },
        })
        .catch(() => {
          // Silent fail — workflow execution is best-effort
        });
    }
  } catch {
    // Never throw — workflow dispatch is fire-and-forget
  }
}

// === Template Workflows ===

export interface WorkflowTemplate {
  name: string;
  description: string;
  triggerConfig: WorkflowTriggerConfig;
  steps: WorkflowStep[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "NPS Alert Pipeline",
    description: "When NPS score is below 5, create a support ticket and send Slack notification",
    triggerConfig: {
      type: TRIGGER_TYPES.DETRACTOR_ALERT,
      config: {},
    },
    steps: [
      {
        id: "cond-1",
        type: "condition",
        config: {
          id: "cond-1",
          type: CONDITION_TYPES.SCORE_BELOW,
          field: "nps_score",
          operator: "less_than",
          value: 5,
        },
        position: { x: 0, y: 0 },
      },
      {
        id: "action-1",
        type: "action",
        config: {
          id: "action-1",
          type: ACTION_TYPES.CREATE_TICKET,
          config: {
            subject: "Low NPS Alert: {{respondent_email}}",
            description: "Customer scored {{nps_score}}/10. Follow-up required.",
            priority: "high",
          },
        },
        position: { x: 0, y: 1 },
      },
      {
        id: "action-2",
        type: "action",
        config: {
          id: "action-2",
          type: ACTION_TYPES.SLACK_MESSAGE,
          config: {
            message: "Detractor alert: {{respondent_email}} scored {{nps_score}}/10",
          },
        },
        position: { x: 0, y: 2 },
      },
    ],
  },
  {
    name: "Waitlist Welcome",
    description: "When waitlist reaches 1000 entries, send a celebration email",
    triggerConfig: {
      type: TRIGGER_TYPES.WAITLIST_MILESTONE,
      config: { milestone: 1000 },
    },
    steps: [
      {
        id: "cond-1",
        type: "condition",
        config: {
          id: "cond-1",
          type: CONDITION_TYPES.COUNT_EXCEEDS,
          field: "position",
          operator: "equals",
          value: 1000,
        },
        position: { x: 0, y: 0 },
      },
      {
        id: "action-1",
        type: "action",
        config: {
          id: "action-1",
          type: ACTION_TYPES.SEND_EMAIL,
          config: {
            template: "waitlist_invite",
            to: "{{email}}",
            variables: { formTitle: "{{form_title}}" },
          },
        },
        position: { x: 0, y: 1 },
      },
    ],
  },
  {
    name: "Auto-Assign Billing Tickets",
    description: "Automatically assign tickets in the 'billing' category to the finance team",
    triggerConfig: {
      type: TRIGGER_TYPES.TICKET_CREATED,
      config: {},
    },
    steps: [
      {
        id: "cond-1",
        type: "condition",
        config: {
          id: "cond-1",
          type: CONDITION_TYPES.FIELD_EQUALS,
          field: "category",
          operator: "equals",
          value: "billing",
        },
        position: { x: 0, y: 0 },
      },
      {
        id: "action-1",
        type: "action",
        config: {
          id: "action-1",
          type: ACTION_TYPES.ADD_TAG,
          config: { tagName: "billing" },
        },
        position: { x: 0, y: 1 },
      },
      {
        id: "action-2",
        type: "action",
        config: {
          id: "action-2",
          type: ACTION_TYPES.CHANGE_STATUS,
          config: { status: "in_progress" },
        },
        position: { x: 0, y: 2 },
      },
    ],
  },
];

// === Utility: generate step ID ===
export function generateStepId(): string {
  return `step-${crypto.randomUUID().slice(0, 8)}`;
}
