// ============================================
// SlackIntegration — Slack webhook configuration panel (Agent 10)
// ============================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_EVENTS, type WebhookEventType } from "@/lib/webhookEvents";
import type { SlackConfig } from "@/hooks/useIntegrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Hash, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface SlackIntegrationProps {
  formId: string;
  config: SlackConfig;
  saving: boolean;
  onSave: (config: SlackConfig) => Promise<boolean>;
}

const SLACK_EVENTS: { key: WebhookEventType; label: string }[] = [
  { key: WEBHOOK_EVENTS.SUBMISSION_CREATED, label: "integrations.slackEventSubmission" },
  { key: WEBHOOK_EVENTS.WAITLIST_SIGNUP, label: "integrations.slackEventWaitlist" },
  { key: WEBHOOK_EVENTS.FEEDBACK_RESPONSE, label: "integrations.slackEventFeedback" },
  { key: WEBHOOK_EVENTS.TICKET_CREATED, label: "integrations.slackEventTicket" },
  { key: WEBHOOK_EVENTS.TICKET_RESOLVED, label: "integrations.slackEventTicketResolved" },
];

export default function SlackIntegration({ formId, config, saving, onSave }: SlackIntegrationProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState(config.webhook_url);
  const [channelName, setChannelName] = useState(config.channel_name);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(config.events);
  const [enabled, setEnabled] = useState(config.enabled);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const isValidUrl = webhookUrl.startsWith("https://hooks.slack.com/");

  const handleEventToggle = (eventKey: string, checked: boolean) => {
    setSelectedEvents((prev) =>
      checked ? [...prev, eventKey] : prev.filter((e) => e !== eventKey)
    );
  };

  const handleSave = async () => {
    const newConfig: SlackConfig = {
      enabled,
      webhook_url: webhookUrl.trim(),
      channel_name: channelName.trim(),
      events: selectedEvents,
    };

    const success = await onSave(newConfig);
    if (success) {
      toast({ title: t("integrations.slackSaved"), description: t("integrations.slackSavedDesc") });
    } else {
      toast({ title: t("common.error"), description: t("integrations.slackSaveError"), variant: "destructive" });
    }
  };

  const handleTest = async () => {
    if (!webhookUrl || !isValidUrl) return;
    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("slack-notify", {
        body: {
          webhook_url: webhookUrl,
          event_type: "form.submission_created",
          form_title: "Test Form",
          data: {
            email: "test@example.com",
            name: "Test User",
          },
        },
      });

      if (error || !data?.success) {
        setTestResult("error");
        toast({
          title: t("integrations.slackTestFailed"),
          description: t("integrations.slackTestFailedDesc"),
          variant: "destructive",
        });
      } else {
        setTestResult("success");
        toast({
          title: t("integrations.slackTestSuccess"),
          description: t("integrations.slackTestSuccessDesc"),
        });
      }
    } catch {
      setTestResult("error");
      toast({
        title: t("integrations.slackTestFailed"),
        description: t("integrations.slackTestFailedDesc"),
        variant: "destructive",
      });
    }

    setTesting(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A154B]">
              <Hash className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("integrations.slack")}</CardTitle>
              <CardDescription>{t("integrations.slackDesc")}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.enabled && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                {t("integrations.connected")}
              </Badge>
            )}
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-6">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="slack-webhook">{t("integrations.slackWebhookUrl")}</Label>
            <div className="flex gap-2">
              <Input
                id="slack-webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                dir="ltr"
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing || !isValidUrl}
                className="shrink-0"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testResult === "success" ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : testResult === "error" ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ms-1">{t("integrations.test")}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("integrations.slackWebhookHelp")}</p>
          </div>

          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="slack-channel">{t("integrations.slackChannel")}</Label>
            <Input
              id="slack-channel"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="#general"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">{t("integrations.slackChannelHelp")}</p>
          </div>

          {/* Event Selector */}
          <div className="space-y-3">
            <Label>{t("integrations.slackEvents")}</Label>
            <div className="space-y-2">
              {SLACK_EVENTS.map((event) => (
                <div key={event.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`slack-event-${event.key}`}
                    checked={selectedEvents.includes(event.key)}
                    onCheckedChange={(checked) => handleEventToggle(event.key, !!checked)}
                  />
                  <label
                    htmlFor={`slack-event-${event.key}`}
                    className="text-sm cursor-pointer"
                  >
                    {t(event.label)}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("integrations.slackEventsHelp")}</p>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving || !isValidUrl}>
            {saving ? t("common.saving") : t("common.saveChanges")}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
