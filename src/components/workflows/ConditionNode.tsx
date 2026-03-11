// ============================================
// ConditionNode — Condition configuration card
// Agent 15: Visual Workflow Builder
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GitBranch, Trash2 } from "lucide-react";
import {
  CONDITION_TYPES,
  CONDITION_LABELS,
  type ConditionType,
  type WorkflowCondition,
} from "@/lib/workflowEngine";

interface ConditionNodeProps {
  condition: WorkflowCondition;
  onChange: (condition: WorkflowCondition) => void;
  onRemove: () => void;
  index: number;
}

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "less_than", label: "Less Than" },
  { value: "greater_than", label: "Greater Than" },
  { value: "contains", label: "Contains" },
];

const FIELD_OPTIONS = [
  { value: "nps_score", label: "NPS Score" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "email", label: "Email" },
  { value: "position", label: "Waitlist Position" },
  { value: "sentiment", label: "Sentiment" },
];

export default function ConditionNode({ condition, onChange, onRemove, index }: ConditionNodeProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
              <GitBranch className="h-3 w-3" />
            </div>
            Condition {index + 1}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Condition Type</Label>
          <Select
            value={condition.type}
            onValueChange={(value: ConditionType) =>
              onChange({ ...condition, type: value })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CONDITION_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {CONDITION_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Field</Label>
          <Select
            value={condition.field || ""}
            onValueChange={(value) => onChange({ ...condition, field: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {FIELD_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Operator</Label>
          <Select
            value={condition.operator || "equals"}
            onValueChange={(value) => onChange({ ...condition, operator: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Value</Label>
          <Input
            value={String(condition.value ?? "")}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            placeholder="Enter value..."
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
