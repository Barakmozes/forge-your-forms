// ============================================
// Workflows — List page for workspace workflows
// Agent 15: Visual Workflow Builder
// ============================================

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import WorkflowList from "@/components/workflows/WorkflowList";
import FeatureGate from "@/components/upgrade/FeatureGate";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkflows } from "@/hooks/useWorkflows";

export default function Workflows() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { workflows, loading, toggleWorkflow, duplicateWorkflow, deleteWorkflow } = useWorkflows(
    currentWorkspace?.id || ""
  );

  return (
    <AppLayout>
      <FeatureGate feature="workflows" requiredPlan="business" featureName={t("workflows.title")}>
        <div className="container max-w-4xl py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold font-display flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                {t("workflows.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("workflows.description")}
              </p>
            </div>
            <Button onClick={() => navigate("/workflows/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("workflows.createWorkflow")}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <WorkflowList
              workflows={workflows}
              onToggle={toggleWorkflow}
              onDuplicate={duplicateWorkflow}
              onDelete={deleteWorkflow}
            />
          )}
        </div>
      </FeatureGate>
    </AppLayout>
  );
}
