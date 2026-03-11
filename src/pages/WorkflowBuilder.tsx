// ============================================
// WorkflowBuilder — Create/edit workflow page
// Agent 15: Visual Workflow Builder
// ============================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
        title: "Validation Error",
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
          toast({ title: "Workflow saved" });
        } else {
          toast({ title: "Failed to save workflow", variant: "destructive" });
        }
      } else {
        const workflow = await createWorkflow(name, description, triggerConfig, steps);
        if (workflow) {
          toast({ title: "Workflow created" });
          navigate(`/workflows/${workflow.id}/edit`, { replace: true });
        } else {
          toast({ title: "Failed to create workflow", variant: "destructive" });
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
    toast({ title: "Template applied", description: `"${template.name}" loaded.` });
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
                {isEditing ? "Edit Workflow" : "New Workflow"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isEditing ? "Modify your automation" : "Build a new automation pipeline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <div className="flex items-center gap-2 mr-2">
                <Label htmlFor="active-toggle" className="text-sm text-muted-foreground">Active</Label>
                <Switch
                  id="active-toggle"
                  checked={active}
                  onCheckedChange={setActive}
                />
              </div>
            )}
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="builder">
          <TabsList>
            <TabsTrigger value="builder">Builder</TabsTrigger>
            {isEditing && <TabsTrigger value="runs">Runs</TabsTrigger>}
          </TabsList>

          <TabsContent value="builder" className="space-y-6 mt-4">
            {/* Name & Description */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>Workflow Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. NPS Alert Pipeline"
                        className="mt-1 max-w-md"
                      />
                    </div>
                    <div>
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What does this workflow do?"
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
                          Templates
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Workflow Templates</DialogTitle>
                          <DialogDescription>
                            Start with a pre-built workflow and customize it.
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
                                    {template.steps.filter((s) => s.type === "condition").length} conditions
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {template.steps.filter((s) => s.type === "action").length} actions
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
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
                  <CardTitle className="text-base">Execution History</CardTitle>
                </CardHeader>
                <CardContent>
                  {runsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading runs...</p>
                  ) : runs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No runs yet. Activate this workflow to start.</p>
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
                                {run.status === "completed" ? "Completed" : run.status === "failed" ? "Failed" : "Running"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {run.steps_executed?.length ?? 0} steps executed
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
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
