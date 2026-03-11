// ============================================
// TriggerNode — Trigger configuration card
// Agent 15: Visual Workflow Builder
// ============================================

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  TRIGGER_TYPES,
  TRIGGER_LABELS,
  TRIGGER_DESCRIPTIONS,
  type TriggerType,
  type WorkflowTriggerConfig,
} from "@/lib/workflowEngine";

interface TriggerNodeProps {
  config: WorkflowTriggerConfig;
  onChange: (config: WorkflowTriggerConfig) => void;
}

interface FormOption {
  id: string;
  title: string;
  mode: string;
}

const TRIGGER_LABEL_KEYS: Record<string, string> = {
  form_submitted: "workflows.trigger.formSubmitted",
  nps_below_threshold: "workflows.trigger.npsBelowThreshold",
  ticket_created: "workflows.trigger.ticketCreated",
  waitlist_milestone: "workflows.trigger.waitlistMilestone",
  ticket_resolved: "workflows.trigger.ticketResolved",
  detractor_alert: "workflows.trigger.detractorAlert",
};

const TRIGGER_DESC_KEYS: Record<string, string> = {
  form_submitted: "workflows.trigger.formSubmittedDesc",
  nps_below_threshold: "workflows.trigger.npsBelowThresholdDesc",
  ticket_created: "workflows.trigger.ticketCreatedDesc",
  waitlist_milestone: "workflows.trigger.waitlistMilestoneDesc",
  ticket_resolved: "workflows.trigger.ticketResolvedDesc",
  detractor_alert: "workflows.trigger.detractorAlertDesc",
};

export default function TriggerNode({ config, onChange }: TriggerNodeProps) {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [forms, setForms] = useState<FormOption[]>([]);

  useEffect(() => {
    if (!currentWorkspace) return;
    supabase
      .from("forms")
      .select("id, title, mode")
      .eq("workspace_id", currentWorkspace.id)
      .order("title")
      .then(({ data }) => {
        if (data) setForms(data as FormOption[]);
      });
  }, [currentWorkspace]);

  const needsThreshold = config.type === TRIGGER_TYPES.NPS_BELOW_THRESHOLD;
  const needsMilestone = config.type === TRIGGER_TYPES.WAITLIST_MILESTONE;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Zap className="h-3 w-3" />
          </div>
          {t("workflows.trigger.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">{t("workflows.trigger.whenThisHappens")}</Label>
          <Select
            value={config.type}
            onValueChange={(value: TriggerType) =>
              onChange({ ...config, type: value, config: {} })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t("workflows.trigger.selectTrigger")} />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TRIGGER_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {t(TRIGGER_LABEL_KEYS[type])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {config.type && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t(TRIGGER_DESC_KEYS[config.type])}
            </p>
          )}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">{t("workflows.trigger.forForm")}</Label>
          <Select
            value={config.formId || "all"}
            onValueChange={(value) =>
              onChange({ ...config, formId: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t("workflows.trigger.allForms")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("workflows.trigger.allForms")}</SelectItem>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.title} ({form.mode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsThreshold && (
          <div>
            <Label className="text-xs text-muted-foreground">{t("workflows.trigger.npsThreshold")}</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={String(config.config.threshold ?? 5)}
              onChange={(e) =>
                onChange({
                  ...config,
                  config: { ...config.config, threshold: Number(e.target.value) },
                })
              }
              className="mt-1"
            />
          </div>
        )}

        {needsMilestone && (
          <div>
            <Label className="text-xs text-muted-foreground">{t("workflows.trigger.milestoneCount")}</Label>
            <Input
              type="number"
              min={1}
              value={String(config.config.milestone ?? 100)}
              onChange={(e) =>
                onChange({
                  ...config,
                  config: { ...config.config, milestone: Number(e.target.value) },
                })
              }
              className="mt-1"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
