import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWebhookDeliveries } from "@/hooks/useWebhooks";
import { useToast } from "@/hooks/use-toast";
import { WEBHOOK_EVENT_LABELS, type WebhookEventType } from "@/lib/webhookEvents";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DeliveryLogProps {
  webhookId: string;
}

function statusBadgeVariant(status: number | null, success: boolean): "default" | "secondary" | "destructive" {
  if (success) return "default";
  if (status && status >= 400 && status < 500) return "secondary";
  return "destructive";
}

function statusColor(status: number | null, success: boolean): string {
  if (success) return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400";
  if (status && status >= 400 && status < 500) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400";
  return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
}

export default function DeliveryLog({ webhookId }: DeliveryLogProps) {
  const { t } = useTranslation();
  const { deliveries, loading, retryDelivery } = useWebhookDeliveries(webhookId);
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function handleRetry(deliveryId: string) {
    setRetrying(deliveryId);
    const { error } = await retryDelivery(deliveryId);
    if (error) {
      toast({ title: t("webhooks.retryFailed"), description: error, variant: "destructive" });
    } else {
      toast({ title: t("webhooks.retryQueued") });
    }
    setRetrying(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {t("webhooks.noDeliveries")}
      </p>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>{t("webhooks.event")}</TableHead>
            <TableHead>{t("webhooks.status")}</TableHead>
            <TableHead>{t("webhooks.attempts")}</TableHead>
            <TableHead>{t("webhooks.timestamp")}</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => {
            const isExpanded = expandedId === delivery.id;

            return (
              <Collapsible key={delivery.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : delivery.id)} asChild>
                <>
                  <CollapsibleTrigger asChild>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {t(WEBHOOK_EVENT_LABELS[delivery.event_type as WebhookEventType] ?? delivery.event_type)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant(delivery.response_status, delivery.success)}
                          className={cn("text-xs", statusColor(delivery.response_status, delivery.success))}
                        >
                          {delivery.response_status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {delivery.attempts}/{delivery.max_attempts}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(delivery.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        {!delivery.success && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleRetry(delivery.id); }}
                            disabled={retrying === delivery.id}
                          >
                            {retrying === delivery.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  </CollapsibleTrigger>

                  <CollapsibleContent asChild>
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t("webhooks.requestPayload")}</p>
                            <pre className="text-xs bg-background rounded p-3 overflow-x-auto max-h-40 border">
                              {JSON.stringify(delivery.payload, null, 2)}
                            </pre>
                          </div>
                          {delivery.response_body && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">{t("webhooks.responseBody")}</p>
                              <pre className="text-xs bg-background rounded p-3 overflow-x-auto max-h-40 border">
                                {delivery.response_body}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
