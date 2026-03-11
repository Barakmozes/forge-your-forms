// ============================================
// ActionNode — Action configuration card
// Agent 15: Visual Workflow Builder
// ============================================

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play, Trash2 } from "lucide-react";
import {
  ACTION_TYPES,
  type ActionType,
  type WorkflowAction,
} from "@/lib/workflowEngine";

const ACTION_LABEL_KEYS: Record<string, string> = {
  send_email: "workflows.action.sendEmail",
  create_ticket: "workflows.action.createTicket",
  slack_message: "workflows.action.slackMessage",
  fire_webhook: "workflows.action.fireWebhook",
  change_status: "workflows.action.changeStatus",
  add_tag: "workflows.action.addTag",
};

const ACTION_DESC_KEYS: Record<string, string> = {
  send_email: "workflows.action.sendEmailDesc",
  create_ticket: "workflows.action.createTicketDesc",
  slack_message: "workflows.action.slackMessageDesc",
  fire_webhook: "workflows.action.fireWebhookDesc",
  change_status: "workflows.action.changeStatusDesc",
  add_tag: "workflows.action.addTagDesc",
};

interface ActionNodeProps {
  action: WorkflowAction;
  onChange: (action: WorkflowAction) => void;
  onRemove: () => void;
  index: number;
}

export default function ActionNode({ action, onChange, onRemove, index }: ActionNodeProps) {
  const { t } = useTranslation();
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
            {t("workflows.action.title", { index: index + 1 })}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">{t("workflows.action.actionType")}</Label>
          <Select
            value={action.type}
            onValueChange={(value: ActionType) =>
              onChange({ ...action, type: value, config: {} })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t("workflows.action.selectAction")} />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ACTION_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {t(ACTION_LABEL_KEYS[type])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {action.type && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t(ACTION_DESC_KEYS[action.type])}
            </p>
          )}
        </div>

        {/* Action-specific config fields */}
        {action.type === ACTION_TYPES.SEND_EMAIL && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">{t("workflows.action.toEmail", { variable: "{{variable}}" })}</Label>
              <Input
                value={String(action.config.to ?? "{{email}}")}
                onChange={(e) => updateConfig("to", e.target.value)}
                placeholder="{{email}}"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("workflows.action.emailTemplate")}</Label>
              <Select
                value={String(action.config.template ?? "detractor_alert")}
                onValueChange={(value) => updateConfig("template", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detractor_alert">{t("workflows.action.templateDetractorAlert")}</SelectItem>
                  <SelectItem value="ticket_confirmation">{t("workflows.action.templateTicketConfirmation")}</SelectItem>
                  <SelectItem value="waitlist_invite">{t("workflows.action.templateWaitlistInvite")}</SelectItem>
                  <SelectItem value="welcome">{t("workflows.action.templateWelcome")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {action.type === ACTION_TYPES.CREATE_TICKET && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">{t("workflows.action.subject")}</Label>
              <Input
                value={String(action.config.subject ?? "")}
                onChange={(e) => updateConfig("subject", e.target.value)}
                placeholder={t("workflows.action.subjectPlaceholder", { respondent_email: "{{respondent_email}}" })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("workflows.action.ticketDescription")}</Label>
              <Textarea
                value={String(action.config.description ?? "")}
                onChange={(e) => updateConfig("description", e.target.value)}
                placeholder={t("workflows.action.ticketDescriptionPlaceholder", { nps_score: "{{nps_score}}" })}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("workflows.action.priorityLabel")}</Label>
              <Select
                value={String(action.config.priority ?? "medium")}
                onValueChange={(value) => updateConfig("priority", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("workflows.action.priorityLow")}</SelectItem>
                  <SelectItem value="medium">{t("workflows.action.priorityMedium")}</SelectItem>
                  <SelectItem value="high">{t("workflows.action.priorityHigh")}</SelectItem>
                  <SelectItem value="urgent">{t("workflows.action.priorityUrgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {action.type === ACTION_TYPES.SLACK_MESSAGE && (
          <div>
            <Label className="text-xs text-muted-foreground">{t("workflows.action.message")}</Label>
            <Textarea
              value={String(action.config.message ?? "")}
              onChange={(e) => updateConfig("message", e.target.value)}
              placeholder={t("workflows.action.messagePlaceholder", { email: "{{email}}" })}
              className="mt-1"
              rows={2}
            />
          </div>
        )}

        {action.type === ACTION_TYPES.FIRE_WEBHOOK && (
          <div>
            <Label className="text-xs text-muted-foreground">{t("workflows.action.eventType")}</Label>
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
            <Label className="text-xs text-muted-foreground">{t("workflows.action.newStatus")}</Label>
            <Select
              value={String(action.config.status ?? "")}
              onValueChange={(value) => updateConfig("status", value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t("workflows.action.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{t("workflows.action.statusOpen")}</SelectItem>
                <SelectItem value="in_progress">{t("workflows.action.statusInProgress")}</SelectItem>
                <SelectItem value="waiting">{t("workflows.action.statusWaiting")}</SelectItem>
                <SelectItem value="resolved">{t("workflows.action.statusResolved")}</SelectItem>
                <SelectItem value="closed">{t("workflows.action.statusClosed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {action.type === ACTION_TYPES.ADD_TAG && (
          <div>
            <Label className="text-xs text-muted-foreground">{t("workflows.action.tagName")}</Label>
            <Input
              value={String(action.config.tagName ?? "")}
              onChange={(e) => updateConfig("tagName", e.target.value)}
              placeholder={t("workflows.action.tagNamePlaceholder")}
              className="mt-1"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
