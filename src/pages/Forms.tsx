import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useForms } from "@/hooks/useForms";
import AppLayout from "@/components/AppLayout";
import DashboardHome from "@/components/dashboard/DashboardHome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Inbox, ClipboardList, Users, MessageSquare, Headphones, LayoutDashboard, List, MoreVertical, Copy, LayoutTemplate, Sparkles } from "lucide-react";
// === AGENT 12: AI Create Button ===
import AiFormGenerator from "@/components/ai/AiFormGenerator";
import FeatureGate from "@/components/upgrade/FeatureGate";
// === END AGENT 12 ===
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
// === AGENT 7: Plan Limits ===
import { usePlanLimits, getRequiredPlanForMode } from "@/hooks/usePlanLimits";
import PaywallModal from "@/components/upgrade/PaywallModal";
// === END AGENT 7 ===
import type { Database } from "@/integrations/supabase/types";

type FormMode = Database["public"]["Enums"]["form_mode"];

const MODE_CONFIG: Record<FormMode, { labelKey: string; icon: React.ElementType; color: string; badgeClass: string; descKey: string; available: boolean }> = {
  standard: { labelKey: "forms.modeStandard", icon: ClipboardList, color: "border-blue-500/50 bg-blue-500/5", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", descKey: "forms.modeStandardDesc", available: true },
  waitlist: { labelKey: "forms.modeWaitlist", icon: Users, color: "border-purple-500/50 bg-purple-500/5", badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", descKey: "forms.modeWaitlistDesc", available: true },
  feedback: { labelKey: "forms.modeFeedback", icon: MessageSquare, color: "border-amber-500/50 bg-amber-500/5", badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", descKey: "forms.modeFeedbackDesc", available: true },
  support: { labelKey: "forms.modeSupport", icon: Headphones, color: "border-green-500/50 bg-green-500/5", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", descKey: "forms.modeSupportDesc", available: true },
};

function ModeBadge({ mode }: { mode: FormMode }) {
  const { t } = useTranslation();
  const config = MODE_CONFIG[mode];
  return (
    <Badge variant="secondary" className={`text-[10px] font-medium ${config.badgeClass}`}>
      {t(config.labelKey)}
    </Badge>
  );
}

export default function Forms() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { forms, isLoading, refetch, createForm } = useForms();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedMode, setSelectedMode] = useState<FormMode>("standard");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  // === AGENT 7: Form Creation Gate ===
  const { canCreateForm, canAccessMode } = usePlanLimits();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallPlan, setPaywallPlan] = useState<"free" | "pro" | "growth" | "business">("pro");
  const [paywallFeature, setPaywallFeature] = useState("");
  // === END AGENT 7 ===
  // === AGENT 12: AI Create Button ===
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  // === END AGENT 12 ===

  // Real-time: refetch when new submissions arrive to update counts
  useEffect(() => {
    if (!currentWorkspace) return;
    const channel = supabase
      .channel(`workspace-submissions-${currentWorkspace.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentWorkspace, refetch]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    // === AGENT 7: Form Creation Gate ===
    if (!canCreateForm(selectedMode)) {
      setDialogOpen(false);
      setPaywallPlan(getRequiredPlanForMode(selectedMode));
      setPaywallFeature(
        !canAccessMode(selectedMode)
          ? t(`forms.mode${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}`)
          : t("upgrade.moreFormsFeature")
      );
      setPaywallOpen(true);
      return;
    }
    // === END AGENT 7 ===
    try {
      const result = await createForm.mutateAsync({
        title: newTitle,
        description: newDesc || null,
        mode: selectedMode,
      });
      if (result) {
        navigate(`/forms/${result.id}/edit`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("forms.failedCreate");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
    setDialogOpen(false);
    setSelectedMode("standard");
    setNewTitle("");
    setNewDesc("");
  };

  const handleDuplicate = async (formId: string) => {
    if (!currentWorkspace || !user) return;
    setDuplicating(formId);
    try {
      // Fetch the full form data
      const { data: original, error: fetchError } = await supabase
        .from("forms")
        .select("title, description, fields, settings, mode, branding")
        .eq("id", formId)
        .single();

      if (fetchError || !original) throw fetchError || new Error("Form not found");

      const { data: newForm, error: insertError } = await supabase
        .from("forms")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          title: t("forms.copyOf", { title: original.title }),
          description: original.description,
          fields: original.fields,
          settings: original.settings,
          mode: original.mode as FormMode,
          branding: original.branding,
          status: "draft" as const,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      toast({ title: t("forms.formDuplicated"), description: t("forms.duplicateDescription", { title: original.title }) });
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("forms.failedDuplicate");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
    setDuplicating(null);
  };

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-success/15 text-success",
    closed: "bg-destructive/15 text-destructive",
  };

  const createDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> {t("forms.newForm")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("forms.createNewForm")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{t("forms.mode")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(MODE_CONFIG) as [FormMode, typeof MODE_CONFIG[FormMode]][]).map(([mode, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={!config.available}
                    className={`relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 ltr:text-left rtl:text-right transition-all ${
                      selectedMode === mode ? config.color + " ring-1 ring-offset-1" : "border-border hover:border-muted-foreground/30"
                    } ${!config.available ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    onClick={() => config.available && setSelectedMode(mode)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{t(config.labelKey)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{t(config.descKey)}</span>
                    {!config.available && (
                      <Badge variant="outline" className="absolute top-2 end-2 text-[9px]">{t("forms.soon")}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("forms.title")}</Label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("forms.titlePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("forms.descriptionOptional")}</Label>
            <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t("forms.descriptionPlaceholder")} rows={3} />
          </div>
          <Button onClick={handleCreate} disabled={createForm.isPending || !newTitle.trim()} className="w-full">
            {createForm.isPending ? t("forms.creating") : t("forms.createForm")}
          </Button>
          {/* === AGENT 11: Template Quick Start === */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={() => { setDialogOpen(false); navigate("/templates"); }}>
            <LayoutTemplate className="h-4 w-4" />
            Start from Template
          </Button>
          {/* === END AGENT 11 === */}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <AppLayout>
      <Tabs defaultValue="dashboard">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="h-9">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
              <LayoutDashboard className="h-3.5 w-3.5" /> {t("forms.dashboard")}
            </TabsTrigger>
            <TabsTrigger value="forms" className="gap-1.5 text-xs">
              <List className="h-3.5 w-3.5" /> {t("forms.allForms")}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {/* === AGENT 12: AI Create Button === */}
            <FeatureGate feature="ai" requiredPlan="business" featureName="AI Form Generator" fallback={
              <Button variant="outline" className="gap-2 opacity-60" onClick={() => { setPaywallPlan("business"); setPaywallFeature("AI Form Generator"); setPaywallOpen(true); }}>
                <Sparkles className="h-4 w-4" /> {t("ai.createWithAi")}
              </Button>
            }>
              <Button variant="outline" className="gap-2" onClick={() => setAiDialogOpen(true)}>
                <Sparkles className="h-4 w-4" /> {t("ai.createWithAi")}
              </Button>
            </FeatureGate>
            {/* === END AGENT 12 === */}
            {createDialog}
          </div>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          <DashboardHome onCreateForm={() => setDialogOpen(true)} />
        </TabsContent>

        <TabsContent value="forms" className="mt-0">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-5 w-2/3 bg-muted rounded" /><div className="h-3 w-1/2 bg-muted rounded mt-2" /></CardHeader>
                </Card>
              ))}
            </div>
          ) : forms.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg">{t("forms.noFormsYet")}</h3>
                <p className="text-muted-foreground text-sm max-w-sm">{t("forms.noFormsDescription")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {forms.map((form) => (
                <Card
                  key={form.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(form.mode === "standard" ? `/forms/${form.id}/edit` : `/forms/${form.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-semibold line-clamp-1">{form.title}</CardTitle>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ModeBadge mode={form.mode} />
                        <Badge variant="secondary" className={`text-xs ${statusColor[form.status] ?? ""}`}>
                          {t(`forms.status${form.status.charAt(0).toUpperCase() + form.status.slice(1)}`)}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(form.id);
                              }}
                              disabled={duplicating === form.id}
                            >
                              <Copy className="me-2 h-4 w-4" />
                              {duplicating === form.id ? t("forms.duplicating") : t("forms.duplicate")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {form.description && <CardDescription className="line-clamp-2 mt-1">{form.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <button
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/forms/${form.id}/submissions`);
                        }}
                        title="View submissions"
                      >
                        <Inbox className="h-3.5 w-3.5" />
                        <span className="font-medium tabular-nums">
                          {form.submission_count}
                        </span>
                        <span>{form.submission_count === 1 ? t("forms.response") : t("forms.responses")}</span>
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {t("forms.updated")} {new Date(form.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {/* === AGENT 7: Form Creation Gate === */}
      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        requiredPlan={paywallPlan}
        featureName={paywallFeature}
      />
      {/* === END AGENT 7 === */}
      {/* === AGENT 12: AI Create Dialog === */}
      <AiFormGenerator open={aiDialogOpen} onOpenChange={setAiDialogOpen} />
      {/* === END AGENT 12 === */}
    </AppLayout>
  );
}
