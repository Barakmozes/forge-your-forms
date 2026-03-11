// ============================================
// WorkflowCanvas — Main builder layout
// Agent 15: Visual Workflow Builder
// ============================================

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GitBranch, Play, Plus, ArrowDown } from "lucide-react";
import TriggerNode from "@/components/workflows/TriggerNode";
import ConditionNode from "@/components/workflows/ConditionNode";
import ActionNode from "@/components/workflows/ActionNode";
import {
  type WorkflowTriggerConfig,
  type WorkflowStep,
  type WorkflowCondition,
  type WorkflowAction,
  generateStepId,
  CONDITION_TYPES,
  ACTION_TYPES,
} from "@/lib/workflowEngine";

interface WorkflowCanvasProps {
  triggerConfig: WorkflowTriggerConfig;
  steps: WorkflowStep[];
  onTriggerChange: (config: WorkflowTriggerConfig) => void;
  onStepsChange: (steps: WorkflowStep[]) => void;
}

export default function WorkflowCanvas({
  triggerConfig,
  steps,
  onTriggerChange,
  onStepsChange,
}: WorkflowCanvasProps) {
  const addCondition = () => {
    const id = generateStepId();
    const newStep: WorkflowStep = {
      id,
      type: "condition",
      config: {
        id,
        type: CONDITION_TYPES.FIELD_EQUALS,
        field: "",
        operator: "equals",
        value: "",
      },
      position: { x: 0, y: steps.length },
    };
    onStepsChange([...steps, newStep]);
  };

  const addAction = () => {
    const id = generateStepId();
    const newStep: WorkflowStep = {
      id,
      type: "action",
      config: {
        id,
        type: ACTION_TYPES.SEND_EMAIL,
        config: {},
      },
      position: { x: 0, y: steps.length },
    };
    onStepsChange([...steps, newStep]);
  };

  const updateStep = (index: number, config: WorkflowCondition | WorkflowAction) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], config };
    onStepsChange(updated);
  };

  const removeStep = (index: number) => {
    onStepsChange(steps.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col items-center gap-2 py-6">
      {/* Trigger */}
      <div className="w-full max-w-md">
        <TriggerNode config={triggerConfig} onChange={onTriggerChange} />
      </div>

      {/* Arrow connector */}
      {steps.length > 0 && (
        <div className="flex flex-col items-center text-muted-foreground">
          <div className="h-4 w-px bg-border" />
          <ArrowDown className="h-4 w-4" />
        </div>
      )}

      {/* Steps */}
      {steps.map((step, index) => (
        <div key={step.id} className="w-full max-w-md">
          {step.type === "condition" ? (
            <ConditionNode
              condition={step.config as WorkflowCondition}
              onChange={(config) => updateStep(index, config)}
              onRemove={() => removeStep(index)}
              index={index}
            />
          ) : (
            <ActionNode
              action={step.config as WorkflowAction}
              onChange={(config) => updateStep(index, config)}
              onRemove={() => removeStep(index)}
              index={index}
            />
          )}

          {/* Arrow between steps */}
          {index < steps.length - 1 && (
            <div className="flex flex-col items-center text-muted-foreground">
              <div className="h-4 w-px bg-border" />
              <ArrowDown className="h-4 w-4" />
            </div>
          )}
        </div>
      ))}

      {/* Add step buttons */}
      <Separator className="my-2 w-full max-w-md" />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addCondition} className="gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          <Plus className="h-3 w-3" />
          Condition
        </Button>
        <Button variant="outline" size="sm" onClick={addAction} className="gap-1.5">
          <Play className="h-3.5 w-3.5" />
          <Plus className="h-3 w-3" />
          Action
        </Button>
      </div>
    </div>
  );
}
