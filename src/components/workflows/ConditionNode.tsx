// ============================================
// ConditionNode — Condition configuration card
// Agent 15: Visual Workflow Builder
// ============================================

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GitBranch, Trash2 } from "lucide-react";
import {
  CONDITION_TYPES,
  type ConditionType,
  type WorkflowCondition,
} from "@/lib/workflowEngine";

interface ConditionNodeProps {
  condition: WorkflowCondition;
  onChange: (condition: WorkflowCondition) => void;
  onRemove: () => void;
  index: number;
}

const OPERATOR_KEYS = [
  { value: "equals", labelKey: "workflows.condition.equals" },
  { value: "not_equals", labelKey: "workflows.condition.notEquals" },
  { value: "less_than", labelKey: "workflows.condition.lessThan" },
  { value: "greater_than", labelKey: "workflows.condition.greaterThan" },
  { value: "contains", labelKey: "workflows.condition.contains" },
];

const FIELD_OPTION_KEYS = [
  { value: "nps_score", labelKey: "workflows.condition.fieldNpsScore" },
  { value: "category", labelKey: "workflows.condition.fieldCategory" },
  { value: "status", labelKey: "workflows.condition.fieldStatus" },
  { value: "priority", labelKey: "workflows.condition.fieldPriority" },
  { value: "email", labelKey: "workflows.condition.fieldEmail" },
  { value: "position", labelKey: "workflows.condition.fieldWaitlistPosition" },
  { value: "sentiment", labelKey: "workflows.condition.fieldSentiment" },
];

const CONDITION_LABEL_KEYS: Record<string, string> = {
  field_equals: "workflows.condition.fieldEquals",
  score_below: "workflows.condition.scoreBelow",
  score_above: "workflows.condition.scoreAbove",
  status_is: "workflows.condition.statusIs",
  priority_is: "workflows.condition.priorityIs",
  count_exceeds: "workflows.condition.countExceeds",
};

export default function ConditionNode({ condition, onChange, onRemove, index }: ConditionNodeProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
              <GitBranch className="h-3 w-3" />
            </div>
            {t("workflows.condition.title", { index: index + 1 })}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">{t("workflows.condition.conditionType")}</Label>
          <Select
            value={condition.type}
            onValueChange={(value: ConditionType) =>
              onChange({ ...condition, type: value })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t("workflows.condition.selectCondition")} />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CONDITION_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {t(CONDITION_LABEL_KEYS[type])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">{t("workflows.condition.field")}</Label>
          <Select
            value={condition.field || ""}
            onValueChange={(value) => onChange({ ...condition, field: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t("workflows.condition.selectField")} />
            </SelectTrigger>
            <SelectContent>
              {FIELD_OPTION_KEYS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {t(f.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">{t("workflows.condition.operator")}</Label>
          <Select
            value={condition.operator || "equals"}
            onValueChange={(value) => onChange({ ...condition, operator: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATOR_KEYS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {t(op.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">{t("workflows.condition.value")}</Label>
          <Input
            value={String(condition.value ?? "")}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            placeholder={t("workflows.condition.enterValue")}
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
