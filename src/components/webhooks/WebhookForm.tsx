import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ALL_WEBHOOK_EVENTS, WEBHOOK_EVENT_LABELS, type WebhookEventType } from "@/lib/webhookEvents";
import { Loader2, Copy, Check, Zap } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Webhook = Database["public"]["Tables"]["webhooks"]["Row"];

interface WebhookFormProps {
  webhook?: Webhook | null;
  onSubmit: (data: {
    url: string;
    events: string[];
    secret: string;
    description: string;
    active: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function WebhookForm({ webhook, onSubmit, onCancel, loading }: WebhookFormProps) {
  const { t } = useTranslation();
  const isEditing = !!webhook;

  const [url, setUrl] = useState(webhook?.url ?? "");
  const [events, setEvents] = useState<string[]>(webhook?.events ?? []);
  const [secret] = useState(() => webhook?.secret ?? generateSecret());
  const [description, setDescription] = useState(webhook?.description ?? "");
  const [active, setActive] = useState(webhook?.active ?? true);
  const [copied, setCopied] = useState(false);
  const [urlError, setUrlError] = useState("");

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function validateUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateUrl(url)) {
      setUrlError(t("webhooks.invalidUrl"));
      return;
    }
    setUrlError("");

    if (events.length === 0) return;

    await onSubmit({ url, events, secret, description, active });
  }

  async function handleCopySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }

  async function handleTestWebhook() {
    if (!validateUrl(url)) {
      setUrlError(t("webhooks.invalidUrl"));
      return;
    }

    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          event: "test",
          created_at: new Date().toISOString(),
          data: { message: "Test webhook from FormForge" },
        }),
      });
    } catch {
      // no-cors mode won't give us response details
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isEditing ? t("webhooks.editWebhook") : t("webhooks.addWebhook")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">{t("webhooks.payloadUrl")}</Label>
            <Input
              id="webhook-url"
              type="url"
              dir="ltr"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
              placeholder="https://example.com/webhook"
              className={urlError ? "border-destructive" : ""}
            />
            {urlError && <p className="text-sm text-destructive">{urlError}</p>}
          </div>

          {/* Events */}
          <div className="space-y-3">
            <Label>{t("webhooks.events")}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_WEBHOOK_EVENTS.map((event) => (
                <label
                  key={event}
                  className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={events.includes(event)}
                    onCheckedChange={() => toggleEvent(event)}
                  />
                  <span className="text-sm">{WEBHOOK_EVENT_LABELS[event as WebhookEventType]}</span>
                </label>
              ))}
            </div>
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("webhooks.selectAtLeastOne")}</p>
            )}
          </div>

          {/* Secret */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>{t("webhooks.secret")}</Label>
              <div className="flex gap-2">
                <Input
                  value={secret}
                  readOnly
                  dir="ltr"
                  className="font-mono text-xs bg-muted"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleCopySecret}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("webhooks.secretHint")}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="webhook-desc">{t("webhooks.description")}</Label>
            <Textarea
              id="webhook-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("webhooks.descriptionPlaceholder")}
              className="resize-none min-h-[80px]"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>{t("webhooks.active")}</Label>
              <p className="text-xs text-muted-foreground">{t("webhooks.activeDescription")}</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {/* Selected events summary */}
          {events.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {events.map((event) => (
                <Badge key={event} variant="secondary" className="text-xs">
                  {WEBHOOK_EVENT_LABELS[event as WebhookEventType]}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={loading || events.length === 0}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? t("common.saveChanges") : t("webhooks.createWebhook")}
            </Button>
            {!isEditing && url && (
              <Button type="button" variant="outline" onClick={handleTestWebhook}>
                <Zap className="h-4 w-4" />
                {t("webhooks.test")}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
