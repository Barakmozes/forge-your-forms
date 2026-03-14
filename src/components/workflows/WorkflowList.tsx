// ============================================
// WorkflowList — Workflows listing table
// Agent 15: Visual Workflow Builder
// ============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Copy, Trash2, Zap, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Workflow, type TriggerType } from "@/lib/workflowEngine";
import { formatDistanceToNow } from "date-fns";

interface WorkflowListProps {
  workflows: Workflow[];
  onToggle: (id: string, active: boolean) => Promise<boolean>;
  onDuplicate: (workflow: Workflow) => Promise<unknown>;
  onDelete: (id: string) => Promise<boolean>;
}

const TRIGGER_LABEL_KEYS: Record<string, string> = {
  form_submitted: "workflows.trigger.formSubmitted",
  nps_below_threshold: "workflows.trigger.npsBelowThreshold",
  ticket_created: "workflows.trigger.ticketCreated",
  waitlist_milestone: "workflows.trigger.waitlistMilestone",
  ticket_resolved: "workflows.trigger.ticketResolved",
  detractor_alert: "workflows.trigger.detractorAlert",
};

export default function WorkflowList({ workflows, onToggle, onDuplicate, onDelete }: WorkflowListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleToggle = async (id: string, active: boolean) => {
    const success = await onToggle(id, active);
    if (success) {
      toast({
        title: active ? t("workflows.workflowActivated") : t("workflows.workflowDeactivated"),
        description: active ? t("workflows.activatedDescription") : t("workflows.deactivatedDescription"),
      });
    }
  };

  const handleDuplicate = async (workflow: Workflow) => {
    const result = await onDuplicate(workflow);
    if (result) {
      toast({ title: t("workflows.workflowDuplicated"), description: t("workflows.duplicatedDescription", { name: workflow.name }) });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const success = await onDelete(deleteId);
    if (success) {
      toast({ title: t("workflows.workflowDeleted") });
    }
    setDeleteId(null);
  };

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">{t("workflows.noWorkflowsYet")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("workflows.noWorkflowsDescription")}
          </p>
          <Button className="mt-4" onClick={() => navigate("/workflows/new")}>
            {t("workflows.createWorkflow")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {workflows.map((workflow) => {
          const triggerKey = TRIGGER_LABEL_KEYS[workflow.trigger_config?.type as TriggerType];
          const triggerLabel = triggerKey ? t(triggerKey) : workflow.trigger_config?.type;
          const actionCount = workflow.steps?.filter((s) => s.type === "action").length ?? 0;
          const conditionCount = workflow.steps?.filter((s) => s.type === "condition").length ?? 0;

          return (
            <Card key={workflow.id} className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={workflow.active}
                      onCheckedChange={(checked) => handleToggle(workflow.id, checked)}
                    />
                    <div>
                      <CardTitle className="text-base">{workflow.name}</CardTitle>
                      {workflow.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{workflow.description}</p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px]">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/workflows/${workflow.id}/edit`)}>
                        <Pencil className="me-2 h-4 w-4" /> {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(workflow)}>
                        <Copy className="me-2 h-4 w-4" /> {t("workflows.duplicate")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteId(workflow.id)} className="text-destructive">
                        <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant={workflow.active ? "default" : "secondary"} className="text-xs">
                    {workflow.active ? t("workflows.active") : t("workflows.inactive")}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" /> {triggerLabel}
                  </span>
                  <span>{t("workflows.conditionsCount", { count: conditionCount })}</span>
                  <span>{t("workflows.actionsCount", { count: actionCount })}</span>
                  {workflow.run_count > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" /> {t("workflows.runsCount", { count: workflow.run_count })}
                    </span>
                  )}
                  {workflow.last_run_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t("workflows.lastRun", { time: formatDistanceToNow(new Date(workflow.last_run_at), { addSuffix: true }) })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workflows.deleteWorkflow")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workflows.deleteWorkflowDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
