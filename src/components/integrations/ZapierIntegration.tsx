// ============================================
// ZapierIntegration — Zapier setup guide (Agent 10)
// Documentation-driven — leverages Agent 9's webhook infrastructure
// ============================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import type { ZapierConfig } from "@/hooks/useIntegrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Zap, ExternalLink, Copy, Check, ArrowRight } from "lucide-react";

interface ZapierIntegrationProps {
  formId: string;
  config: ZapierConfig;
  saving: boolean;
  onSave: (config: ZapierConfig) => Promise<boolean>;
  webhookUrl?: string;
}

export default function ZapierIntegration({ config, saving, onSave, webhookUrl }: ZapierIntegrationProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(config.enabled);
  const [copied, setCopied] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    const success = await onSave({ enabled: checked });
    if (!success) {
      setEnabled(!checked);
      toast({ title: t("common.error"), description: t("integrations.zapierSaveError"), variant: "destructive" });
    }
  };

  const handleCopyUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast({ title: t("integrations.copied"), description: t("integrations.webhookUrlCopied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("common.error"), description: t("integrations.copyFailed"), variant: "destructive" });
    }
  };

  const steps = [
    { key: "step1", icon: "1" },
    { key: "step2", icon: "2" },
    { key: "step3", icon: "3" },
    { key: "step4", icon: "4" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("integrations.zapier")}</CardTitle>
              <CardDescription>{t("integrations.zapierDesc")}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {enabled && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                {t("integrations.enabled")}
              </Badge>
            )}
            <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
          </div>
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">{t("integrations.zapierExplanation")}</p>

          {/* Webhook URL display */}
          {webhookUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("integrations.yourWebhookUrl")}</p>
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                <code className="flex-1 text-xs font-mono break-all" dir="ltr">{webhookUrl}</code>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleCopyUrl}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Setup Steps */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">{t("integrations.zapierSetupGuide")}</h4>
            {steps.map((step) => (
              <div key={step.key} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {step.icon}
                </div>
                <p className="text-sm text-muted-foreground">{t(`integrations.zapier${step.key}`)}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Available triggers & actions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1">
                <ArrowRight className="h-3 w-3" /> {t("integrations.availableTriggers")}
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>{t("integrations.triggerSubmission")}</li>
                <li>{t("integrations.triggerWaitlist")}</li>
                <li>{t("integrations.triggerFeedback")}</li>
                <li>{t("integrations.triggerTicket")}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1">
                <ArrowRight className="h-3 w-3" /> {t("integrations.availableActions")}
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>{t("integrations.actionCreateForm")}</li>
                <li>{t("integrations.actionAddWaitlist")}</li>
              </ul>
            </div>
          </div>

          <Button variant="outline" className="gap-2" asChild>
            <a href="https://zapier.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              {t("integrations.openZapier")}
            </a>
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
