// ============================================
// TriggerNode — Trigger configuration card
// Agent 15: Visual Workflow Builder
// ============================================

import { useState, useEffect } from "react";
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

export default function TriggerNode({ config, onChange }: TriggerNodeProps) {
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
          Trigger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">When this happens...</Label>
          <Select
            value={config.type}
            onValueChange={(value: TriggerType) =>
              onChange({ ...config, type: value, config: {} })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select trigger" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TRIGGER_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {TRIGGER_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {config.type && (
            <p className="mt-1 text-xs text-muted-foreground">
              {TRIGGER_DESCRIPTIONS[config.type]}
            </p>
          )}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">For form (optional)</Label>
          <Select
            value={config.formId || "all"}
            onValueChange={(value) =>
              onChange({ ...config, formId: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All forms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All forms</SelectItem>
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
            <Label className="text-xs text-muted-foreground">NPS Threshold</Label>
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
            <Label className="text-xs text-muted-foreground">Milestone Count</Label>
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
