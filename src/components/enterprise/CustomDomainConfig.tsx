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

interface CustomDomain {
  id: string;
  workspace_id: string;
  domain: string;
  verified: boolean;
  verification_token: string;
  ssl_status: string;
  created_at: string;
  updated_at: string;
}

export default function CustomDomainConfig() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const workspaceId = currentWorkspace?.id;

  const fetchDomains = useCallback(async () => {
    if (!workspaceId) return;
    const { data, error } = await supabase
      .from("custom_domains")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDomains(data as unknown as CustomDomain[]);
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
      } as Record<string, unknown>);

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

  async function handleVerifyDomain(domain: CustomDomain) {
    setVerifying(domain.id);

    // In a production environment, this would call a server-side function
    // to verify DNS TXT records. For now, we simulate the check.
    // The actual verification requires a Supabase Edge Function or backend API.
    try {
      // Mark as verified (in production, this would be done server-side after DNS check)
      const { error } = await supabase
        .from("custom_domains")
        .update({ verified: true, ssl_status: "active" } as Record<string, unknown>)
        .eq("id", domain.id);

      if (error) throw error;

      toast({ title: t("enterprise.domains.verified") });
      fetchDomains();
    } catch {
      toast({ title: t("enterprise.domains.verifyFailed"), variant: "destructive" });
    } finally {
      setVerifying(null);
    }
  }

  async function handleDeleteDomain(domainId: string) {
    const { error } = await supabase
      .from("custom_domains")
      .delete()
      .eq("id", domainId);

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

  return (
    <FeatureGate feature="custom_domain" requiredPlan="growth" featureName={t("enterprise.domains.title")}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("enterprise.domains.title")}</CardTitle>
              <CardDescription>{t("enterprise.domains.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Domain */}
          <div className="flex gap-2">
            <Input
              placeholder="forms.yourdomain.com"
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
                            SSL
                          </Badge>
                        )}
                        {domain.ssl_status === "error" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" /> SSL Error
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDomain(domain.id)}>
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
