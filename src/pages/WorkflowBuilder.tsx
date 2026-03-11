// ============================================
// WorkflowBuilder — Create/edit workflow page
// Agent 15: Visual Workflow Builder
// ============================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, Zap, BookOpen, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import WorkflowCanvas from "@/components/workflows/WorkflowCanvas";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkflows, useWorkflowRuns } from "@/hooks/useWorkflows";
import { useToast } from "@/hooks/use-toast";
import {
  type WorkflowTriggerConfig,
  type WorkflowStep,
  TRIGGER_TYPES,
  WORKFLOW_TEMPLATES,
  validateWorkflow,
  jsonToSteps,
} from "@/lib/workflowEngine";
import { formatDistanceToNow } from "date-fns";

export default function WorkflowBuilder() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const { workflows, createWorkflow, updateWorkflow } = useWorkflows(currentWorkspace?.id || "");
  const { runs, loading: runsLoading } = useWorkflowRuns(id || "");

  const isEditing = !!id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(false);
  const [triggerConfig, setTriggerConfig] = useState<WorkflowTriggerConfig>({
    type: TRIGGER_TYPES.FORM_SUBMITTED,
    config: {},
  });
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Load existing workflow for editing
  useEffect(() => {
    if (isEditing && workflows.length > 0) {
      const existing = workflows.find((w) => w.id === id);
      if (existing) {
        setName(existing.name);
        setDescription(existing.description || "");
        setActive(existing.active);
        setTriggerConfig(existing.trigger_config);
        setSteps(jsonToSteps(existing.steps as unknown as unknown[]));
      }
    }
  }, [id, isEditing, workflows]);

  const handleSave = async () => {
    const validation = validateWorkflow(name, triggerConfig, steps);
    if (!validation.valid) {
      toast({
        title: t("workflows.validationError"),
        description: validation.errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        const success = await updateWorkflow(id!, {
          name,
          description,
          trigger_config: triggerConfig,
          steps,
          active,
        });
        if (success) {
          toast({ title: t("workflows.workflowSaved") });
        } else {
          toast({ title: t("workflows.saveFailed"), variant: "destructive" });
        }
      } else {
        const workflow = await createWorkflow(name, description, triggerConfig, steps);
        if (workflow) {
          toast({ title: t("workflows.workflowCreated") });
          navigate(`/workflows/${workflow.id}/edit`, { replace: true });
        } else {
          toast({ title: t("workflows.createFailed"), variant: "destructive" });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: (typeof WORKFLOW_TEMPLATES)[number]) => {
    setName(template.name);
    setDescription(template.description);
    setTriggerConfig(template.triggerConfig);
    setSteps(template.steps);
    setTemplateDialogOpen(false);
    toast({ title: t("workflows.templateApplied"), description: t("workflows.templateLoaded", { name: template.name }) });
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/workflows")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold font-display">
                {isEditing ? t("workflows.editWorkflow") : t("workflows.newWorkflow")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isEditing ? t("workflows.modifyAutomation") : t("workflows.buildAutomation")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <div className="flex items-center gap-2 me-2">
                <Label htmlFor="active-toggle" className="text-sm text-muted-foreground">{t("workflows.active")}</Label>
                <Switch
                  id="active-toggle"
                  checked={active}
                  onCheckedChange={setActive}
                />
              </div>
            )}
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? t("workflows.saving") : t("workflows.save")}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="builder">
          <TabsList>
            <TabsTrigger value="builder">{t("workflows.builder")}</TabsTrigger>
            {isEditing && <TabsTrigger value="runs">{t("workflows.runs")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="builder" className="space-y-6 mt-4">
            {/* Name & Description */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>{t("workflows.workflowName")}</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("workflows.workflowNamePlaceholder")}
                        className="mt-1 max-w-md"
                      />
                    </div>
                    <div>
                      <Label>{t("workflows.descriptionOptional")}</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("workflows.descriptionPlaceholder")}
                        className="mt-1 max-w-md"
                        rows={2}
                      />
                    </div>
                  </div>

                  {!isEditing && (
                    <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 shrink-0">
                          <BookOpen className="h-4 w-4" />
                          {t("workflows.templates")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("workflows.workflowTemplates")}</DialogTitle>
                          <DialogDescription>
                            {t("workflows.templatesDescription")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {WORKFLOW_TEMPLATES.map((template, i) => (
                            <Card key={i} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => applyTemplate(template)}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">{template.name}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-xs text-muted-foreground">{template.description}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {t("workflows.conditionsCount", { count: template.steps.filter((s) => s.type === "condition").length })}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {t("workflows.actionsCount", { count: template.steps.filter((s) => s.type === "action").length })}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setTemplateDialogOpen(false)}>{t("common.cancel")}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Canvas */}
            <WorkflowCanvas
              triggerConfig={triggerConfig}
              steps={steps}
              onTriggerChange={setTriggerConfig}
              onStepsChange={setSteps}
            />
          </TabsContent>

          {isEditing && (
            <TabsContent value="runs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("workflows.executionHistory")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {runsLoading ? (
                    <p className="text-sm text-muted-foreground">{t("workflows.loadingRuns")}</p>
                  ) : runs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{t("workflows.noRunsYet")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {runs.map((run) => (
                        <div key={run.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            {run.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {run.status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
                            {run.status === "running" && <AlertCircle className="h-4 w-4 text-amber-500 animate-pulse" />}
                            <div>
                              <p className="text-sm font-medium">
                                {run.status === "completed" ? t("workflows.completed") : run.status === "failed" ? t("workflows.failed") : t("workflows.running")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("workflows.stepsExecuted", { count: run.steps_executed?.length ?? 0 })}
                              </p>
                            </div>
                          </div>
                          <div className="text-end">
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                            </p>
                            {run.error && (
                              <p className="text-xs text-destructive mt-0.5 max-w-[200px] truncate">
                                {run.error}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
