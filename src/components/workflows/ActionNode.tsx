// ============================================
// ActionNode — Action configuration card
// Agent 15: Visual Workflow Builder
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play, Trash2 } from "lucide-react";
import {
  ACTION_TYPES,
  ACTION_LABELS,
  ACTION_DESCRIPTIONS,
  type ActionType,
  type WorkflowAction,
} from "@/lib/workflowEngine";

interface ActionNodeProps {
  action: WorkflowAction;
  onChange: (action: WorkflowAction) => void;
  onRemove: () => void;
  index: number;
}

export default function ActionNode({ action, onChange, onRemove, index }: ActionNodeProps) {
  const updateConfig = (key: string, value: unknown) => {
    onChange({
      ...action,
      config: { ...action.config, [key]: value },
    });
  };

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
              <Play className="h-3 w-3" />
            </div>
            Action {index + 1}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Action Type</Label>
          <Select
            value={action.type}
            onValueChange={(value: ActionType) =>
              onChange({ ...action, type: value, config: {} })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ACTION_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {ACTION_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {action.type && (
            <p className="mt-1 text-xs text-muted-foreground">
              {ACTION_DESCRIPTIONS[action.type]}
            </p>
          )}
        </div>

        {/* Action-specific config fields */}
        {action.type === ACTION_TYPES.SEND_EMAIL && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">To (email or {"{{variable}}"}):</Label>
              <Input
                value={String(action.config.to ?? "{{email}}")}
                onChange={(e) => updateConfig("to", e.target.value)}
                placeholder="{{email}}"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email Template</Label>
              <Select
                value={String(action.config.template ?? "detractor_alert")}
                onValueChange={(value) => updateConfig("template", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detractor_alert">Detractor Alert</SelectItem>
                  <SelectItem value="ticket_confirmation">Ticket Confirmation</SelectItem>
                  <SelectItem value="waitlist_invite">Waitlist Invite</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {action.type === ACTION_TYPES.CREATE_TICKET && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Input
                value={String(action.config.subject ?? "")}
                onChange={(e) => updateConfig("subject", e.target.value)}
                placeholder="Auto-created ticket: {{respondent_email}}"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={String(action.config.description ?? "")}
                onChange={(e) => updateConfig("description", e.target.value)}
                placeholder="Customer scored {{nps_score}}/10. Follow-up required."
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select
                value={String(action.config.priority ?? "medium")}
                onValueChange={(value) => updateConfig("priority", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {action.type === ACTION_TYPES.SLACK_MESSAGE && (
          <div>
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              value={String(action.config.message ?? "")}
              onChange={(e) => updateConfig("message", e.target.value)}
              placeholder="Workflow notification: {{email}} triggered an alert"
              className="mt-1"
              rows={2}
            />
          </div>
        )}

        {action.type === ACTION_TYPES.FIRE_WEBHOOK && (
          <div>
            <Label className="text-xs text-muted-foreground">Event Type</Label>
            <Input
              value={String(action.config.eventType ?? "workflow.action")}
              onChange={(e) => updateConfig("eventType", e.target.value)}
              placeholder="workflow.action"
              className="mt-1"
            />
          </div>
        )}

        {action.type === ACTION_TYPES.CHANGE_STATUS && (
          <div>
            <Label className="text-xs text-muted-foreground">New Status</Label>
            <Select
              value={String(action.config.status ?? "")}
              onValueChange={(value) => updateConfig("status", value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {action.type === ACTION_TYPES.ADD_TAG && (
          <div>
            <Label className="text-xs text-muted-foreground">Tag Name</Label>
            <Input
              value={String(action.config.tagName ?? "")}
              onChange={(e) => updateConfig("tagName", e.target.value)}
              placeholder="e.g. billing, urgent"
              className="mt-1"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
