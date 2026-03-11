// ============================================
// useWorkflows — CRUD + realtime for workflows
// Agent 15: Visual Workflow Builder
// ============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Workflow,
  WorkflowRun,
  WorkflowTriggerConfig,
  WorkflowStep,
} from "@/lib/workflowEngine";
import { stepsToJson } from "@/lib/workflowEngine";

export function useWorkflows(workspaceId: string) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setWorkflows(data as unknown as Workflow[]);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`workflows-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflows",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          fetchWorkflows();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, fetchWorkflows]);

  const createWorkflow = async (
    name: string,
    description: string,
    triggerConfig: WorkflowTriggerConfig,
    steps: WorkflowStep[]
  ): Promise<Workflow | null> => {
    const { data, error } = await supabase
      .from("workflows")
      .insert({
        workspace_id: workspaceId,
        name,
        description: description || null,
        trigger_config: triggerConfig as unknown as Record<string, unknown>,
        steps: stepsToJson(steps) as unknown as Record<string, unknown>[],
        active: false,
      })
      .select()
      .single();

    if (error) return null;
    return data as unknown as Workflow;
  };

  const updateWorkflow = async (
    id: string,
    updates: {
      name?: string;
      description?: string;
      trigger_config?: WorkflowTriggerConfig;
      steps?: WorkflowStep[];
      active?: boolean;
    }
  ): Promise<boolean> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.trigger_config !== undefined) payload.trigger_config = updates.trigger_config;
    if (updates.steps !== undefined) payload.steps = stepsToJson(updates.steps);
    if (updates.active !== undefined) payload.active = updates.active;

    const { error } = await supabase
      .from("workflows")
      .update(payload)
      .eq("id", id);

    return !error;
  };

  const deleteWorkflow = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from("workflows")
      .delete()
      .eq("id", id);

    return !error;
  };

  const toggleWorkflow = async (id: string, active: boolean): Promise<boolean> => {
    return updateWorkflow(id, { active });
  };

  const duplicateWorkflow = async (workflow: Workflow): Promise<Workflow | null> => {
    return createWorkflow(
      `${workflow.name} (copy)`,
      workflow.description || "",
      workflow.trigger_config,
      workflow.steps
    );
  };

  return {
    workflows,
    loading,
    fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    duplicateWorkflow,
  };
}

// === Workflow Runs Hook ===

export function useWorkflowRuns(workflowId: string) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("workflow_runs")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setRuns(data as unknown as WorkflowRun[]);
    }
    setLoading(false);
  }, [workflowId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Realtime subscription
  useEffect(() => {
    if (!workflowId) return;

    const channel = supabase
      .channel(`workflow-runs-${workflowId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_runs",
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          fetchRuns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId, fetchRuns]);

  return { runs, loading, fetchRuns };
}
