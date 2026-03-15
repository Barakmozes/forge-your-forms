// ============================================
// CustomDomainConfig — Custom domain mapping per workspace (Agent 14)
// ============================================

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { generateVerificationToken, getDnsInstructions } from "@/lib/domains";
import FeatureGate from "@/components/upgrade/FeatureGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Trash2, CheckCircle2, Clock, AlertCircle, Loader2, Copy } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { CustomDomain } from "@/types/enterprise";

export default function CustomDomainConfig() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const workspaceId = currentWorkspace?.id;

  const fetchDomains = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("custom_domains")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setError(null);
      setDomains(data as CustomDomain[]);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  async function handleAddDomain() {
    if (!workspaceId || !newDomain.trim()) return;

    // Basic domain validation
    const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    if (!domainPattern.test(newDomain.trim())) {
      toast({ title: t("enterprise.domains.invalidDomain"), variant: "destructive" });
      return;
    }

    setAdding(true);
    const token = generateVerificationToken();

    const { error } = await supabase
      .from("custom_domains")
      .insert({
        workspace_id: workspaceId,
        domain: newDomain.trim().toLowerCase(),
        verification_token: token,
      });

    if (error) {
      const message = error.message.includes("duplicate")
        ? t("enterprise.domains.alreadyExists")
        : error.message;
      toast({ title: t("enterprise.domains.addFailed"), description: message, variant: "destructive" });
    } else {
      toast({ title: t("enterprise.domains.added") });
      setNewDomain("");
      fetchDomains();
    }
    setAdding(false);
  }

  async function handleVerifyDomain(_domain: CustomDomain) {
    setVerifying(_domain.id);

    // DNS TXT record verification requires a server-side Edge Function to query
    // actual DNS resolvers. Client-side code cannot verify DNS records.
    // This button informs the user and keeps the domain in "pending" state until
    // a server-side verification confirms the TXT record exists.
    // TODO: Implement `verify-domain` Supabase Edge Function (see HANDOFF.md).
    await new Promise((resolve) => setTimeout(resolve, 600));

    toast({
      title: t("enterprise.domains.verificationInitiated"),
      description: t("enterprise.domains.verificationDescription"),
    });

    setVerifying(null);
  }

  async function handleDeleteDomain(domainId: string) {
    const { error } = await supabase
      .from("custom_domains")
      .delete()
      .eq("id", domainId)
      .eq("workspace_id", workspaceId ?? "");

    if (error) {
      toast({ title: t("enterprise.domains.deleteFailed"), variant: "destructive" });
    } else {
      toast({ title: t("enterprise.domains.deleted") });
      setDomains((prev) => prev.filter((d) => d.id !== domainId));
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: t("enterprise.domains.copied") });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{t("enterprise.domains.loadError")}</p>
          <Button variant="outline" size="sm" onClick={fetchDomains}>
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <FeatureGate feature="custom_domain" requiredPlan="growth" featureName={t("enterprise.domains.title")}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {t("enterprise.domains.title")}
                <InfoTooltip contentKey="tooltips.enterprise.customDomainInfo" />
              </CardTitle>
              <CardDescription>{t("enterprise.domains.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Domain */}
          <div className="flex gap-2">
            <Input
              placeholder={t("enterprise.domains.domainPlaceholder")}
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              dir="ltr"
              className="max-w-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <Button onClick={handleAddDomain} disabled={adding || !newDomain.trim()}>
              {adding ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Plus className="me-2 h-4 w-4" />}
              {t("enterprise.domains.addDomain")}
            </Button>
          </div>

          {/* Domain List */}
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t("enterprise.domains.noDomains")}</p>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => {
                const dns = getDnsInstructions(domain.domain, domain.verification_token);
                return (
                  <div key={domain.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium" dir="ltr">{domain.domain}</span>
                        {domain.verified ? (
                          <Badge variant="secondary" className="gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> {t("enterprise.domains.verifiedBadge")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-yellow-600">
                            <Clock className="h-3 w-3" /> {t("enterprise.domains.pendingBadge")}
                          </Badge>
                        )}
                        {domain.ssl_status === "active" && (
                          <Badge variant="secondary" className="gap-1 text-green-600">
                            {t("enterprise.domains.sslActive")}
                          </Badge>
                        )}
                        {domain.ssl_status === "error" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" /> {t("enterprise.domains.sslError")}
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] text-destructive" onClick={() => handleDeleteDomain(domain.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* DNS Instructions (show only for unverified domains) */}
                    {!domain.verified && (
                      <div className="rounded bg-muted p-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{t("enterprise.domains.dnsInstructions")}</p>
                        <div className="grid grid-cols-[auto_1fr_auto] gap-2 text-xs font-mono items-center" dir="ltr">
                          <Label className="text-muted-foreground">{t("enterprise.domains.recordType")}</Label>
                          <span>{dns.type}</span>
                          <div />

                          <Label className="text-muted-foreground">{t("enterprise.domains.recordName")}</Label>
                          <span className="truncate">{dns.name}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(dns.name)}>
                            <Copy className="h-3 w-3" />
                          </Button>

                          <Label className="text-muted-foreground">{t("enterprise.domains.recordValue")}</Label>
                          <span className="truncate">{dns.value}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(dns.value)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => handleVerifyDomain(domain)}
                          disabled={verifying === domain.id}
                        >
                          {verifying === domain.id && <Loader2 className="me-2 h-3 w-3 animate-spin" />}
                          {t("enterprise.domains.verifyDomain")}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
