// ============================================
// IntegrationManager — Grid of integration cards (Agent 10)
// ============================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIntegrations } from "@/hooks/useIntegrations";
import SlackIntegration from "@/components/integrations/SlackIntegration";
import ZapierIntegration from "@/components/integrations/ZapierIntegration";
import MailchimpIntegration from "@/components/integrations/MailchimpIntegration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Hash, Zap, Mail, Send, Loader2, Plug, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import FeatureGate from "@/components/upgrade/FeatureGate";

interface FormOption {
  id: string;
  title: string;
  mode: string;
}

export default function IntegrationManager() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [forms, setForms] = useState<FormOption[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [loadingForms, setLoadingForms] = useState(true);

  // Fetch forms for the workspace
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchForms = async () => {
      setLoadingForms(true);
      const { data } = await supabase
        .from("forms")
        .select("id, title, mode")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (data) {
        setForms(data);
        if (data.length > 0 && !selectedFormId) {
          setSelectedFormId(data[0].id);
        }
      }
      setLoadingForms(false);
    };

    fetchForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  const { integrations, loading, saving, error, updateIntegration } = useIntegrations(selectedFormId);

  const integrationCards = [
    {
      key: "slack" as const,
      name: t("integrations.slack"),
      desc: t("integrations.slackShortDesc"),
      icon: Hash,
      color: "bg-[#4A154B]",
      connected: integrations.slack?.enabled ?? false,
    },
    {
      key: "zapier" as const,
      name: t("integrations.zapier"),
      desc: t("integrations.zapierShortDesc"),
      icon: Zap,
      color: "bg-orange-500",
      connected: integrations.zapier?.enabled ?? false,
    },
    {
      key: "mailchimp" as const,
      name: t("integrations.mailchimp"),
      desc: t("integrations.mailchimpShortDesc"),
      icon: Mail,
      color: "bg-[#FFE01B]",
      connected: integrations.mailchimp?.enabled && !!integrations.mailchimp?.list_id,
    },
    {
      key: "convertkit" as const,
      name: t("integrations.convertkit"),
      desc: t("integrations.convertkitShortDesc"),
      icon: Send,
      color: "bg-red-500",
      connected: false,
    },
  ];

  if (loadingForms) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Plug className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">{t("integrations.noForms")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("integrations.noFormsDesc")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <FeatureGate feature="integrations" requiredPlan="pro" featureName="Integrations">
      <div className="space-y-6">
        {/* Form Selector */}
        <div className="space-y-2">
          <Label>{t("integrations.selectForm")}</Label>
          <Select value={selectedFormId} onValueChange={setSelectedFormId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder={t("integrations.selectFormPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.title} <span className="text-muted-foreground ms-1">({form.mode})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t("integrations.loadError")}: {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Integration Status Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {integrationCards.map((card) => (
                <Card key={card.key} className="cursor-default">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.color}`}>
                      <card.icon className={`h-5 w-5 ${card.key === "mailchimp" ? "text-black" : "text-white"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{card.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{card.desc}</p>
                    </div>
                    {card.connected ? (
                      <Badge variant="outline" className="shrink-0 text-green-600 border-green-300 ms-auto">
                        {t("integrations.on")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-muted-foreground ms-auto">
                        {t("integrations.off")}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Integration Detail Tabs */}
            <Tabs defaultValue="slack">
              <TabsList>
                <TabsTrigger value="slack" className="gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> {t("integrations.slack")}
                </TabsTrigger>
                <TabsTrigger value="zapier" className="gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> {t("integrations.zapier")}
                </TabsTrigger>
                <TabsTrigger value="mailchimp" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {t("integrations.mailchimp")}
                </TabsTrigger>
                <TabsTrigger value="convertkit" className="gap-1.5" disabled>
                  <Send className="h-3.5 w-3.5" /> {t("integrations.convertkit")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="slack" className="mt-4">
                <SlackIntegration
                  formId={selectedFormId}
                  config={integrations.slack!}
                  saving={saving}
                  onSave={(c) => updateIntegration("slack", c)}
                />
              </TabsContent>

              <TabsContent value="zapier" className="mt-4">
                <ZapierIntegration
                  formId={selectedFormId}
                  config={integrations.zapier!}
                  saving={saving}
                  onSave={(c) => updateIntegration("zapier", c)}
                />
              </TabsContent>

              <TabsContent value="mailchimp" className="mt-4">
                <MailchimpIntegration
                  formId={selectedFormId}
                  config={integrations.mailchimp!}
                  saving={saving}
                  onSave={(c) => updateIntegration("mailchimp", c)}
                />
              </TabsContent>

              <TabsContent value="convertkit" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500">
                        <Send className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{t("integrations.convertkit")}</CardTitle>
                        <CardDescription>{t("integrations.convertkitComingSoon")}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{t("integrations.convertkitDesc")}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </FeatureGate>
  );
}
