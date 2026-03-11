import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWebhooks } from "@/hooks/useWebhooks";
import { useToast } from "@/hooks/use-toast";
import { WEBHOOK_EVENT_LABELS, type WebhookEventType } from "@/lib/webhookEvents";
import FeatureGate from "@/components/upgrade/FeatureGate";
import WebhookForm from "@/components/webhooks/WebhookForm";
import DeliveryLog from "@/components/webhooks/DeliveryLog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Webhook,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Loader2,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function WebhookManager() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { webhooks, loading, createWebhook, updateWebhook, deleteWebhook, toggleWebhook } = useWebhooks(currentWorkspace?.id);
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<typeof webhooks[0] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleCreate(data: { url: string; events: string[]; secret: string; description: string; active: boolean }) {
    setSubmitting(true);
    const { error } = await createWebhook({
      url: data.url,
      events: data.events,
      secret: data.secret,
      description: data.description || null,
      active: data.active,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: t("webhooks.createFailed"), description: error, variant: "destructive" });
    } else {
      toast({ title: t("webhooks.created") });
      setShowForm(false);
    }
  }

  async function handleUpdate(data: { url: string; events: string[]; secret: string; description: string; active: boolean }) {
    if (!editingWebhook) return;
    setSubmitting(true);
    const { error } = await updateWebhook(editingWebhook.id, {
      url: data.url,
      events: data.events,
      description: data.description || null,
      active: data.active,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: t("webhooks.updateFailed"), description: error, variant: "destructive" });
    } else {
      toast({ title: t("webhooks.updated") });
      setEditingWebhook(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    const { error } = await deleteWebhook(deletingId);
    if (error) {
      toast({ title: t("webhooks.deleteFailed"), description: error, variant: "destructive" });
    } else {
      toast({ title: t("webhooks.deleted") });
    }
    setDeletingId(null);
  }

  async function handleToggle(id: string, active: boolean) {
    await toggleWebhook(id, active);
  }

  if (editingWebhook) {
    return (
      <FeatureGate feature="webhooks" requiredPlan="growth" featureName="Webhooks">
        <WebhookForm
          webhook={editingWebhook}
          onSubmit={handleUpdate}
          onCancel={() => setEditingWebhook(null)}
          loading={submitting}
        />
      </FeatureGate>
    );
  }

  if (showForm) {
    return (
      <FeatureGate feature="webhooks" requiredPlan="growth" featureName="Webhooks">
        <WebhookForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={submitting}
        />
      </FeatureGate>
    );
  }

  return (
    <FeatureGate feature="webhooks" requiredPlan="growth" featureName="Webhooks">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              {t("webhooks.title")}
            </CardTitle>
            <CardDescription>{t("webhooks.subtitle")}</CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            {t("webhooks.addWebhook")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Globe className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t("webhooks.noWebhooks")}</p>
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                {t("webhooks.addFirst")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh) => {
                const isExpanded = expandedId === wh.id;

                return (
                  <Collapsible
                    key={wh.id}
                    open={isExpanded}
                    onOpenChange={() => setExpandedId(isExpanded ? null : wh.id)}
                  >
                    <div className="border rounded-lg">
                      <div className="flex items-center gap-3 p-4">
                        <CollapsibleTrigger className="shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </CollapsibleTrigger>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate" dir="ltr">{wh.url}</p>
                            <Badge variant={wh.active ? "default" : "secondary"} className="text-xs shrink-0">
                              {wh.active ? t("webhooks.active") : t("webhooks.paused")}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(wh.events as string[])?.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {WEBHOOK_EVENT_LABELS[event as WebhookEventType] ?? event}
                              </Badge>
                            ))}
                          </div>
                          {wh.description && (
                            <p className="text-xs text-muted-foreground mt-1">{wh.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={wh.active}
                            onCheckedChange={(checked) => handleToggle(wh.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); setEditingWebhook(wh); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", "text-destructive hover:text-destructive")}
                            onClick={(e) => { e.stopPropagation(); setDeletingId(wh.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="border-t px-4 py-4 bg-muted/20">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium">{t("webhooks.recentDeliveries")}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("webhooks.createdOn", { date: format(new Date(wh.created_at), "MMM d, yyyy") })}
                            </p>
                          </div>
                          <DeliveryLog webhookId={wh.id} />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("webhooks.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("webhooks.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("webhooks.deleteWebhook")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FeatureGate>
  );
}
