// ============================================
// SsoConfig — SSO/SAML configuration for IT admins (Agent 14)
// ============================================

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useEnterprise } from "@/hooks/useEnterprise";
import { useToast } from "@/hooks/use-toast";
import FeatureGate from "@/components/upgrade/FeatureGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const SSO_PROVIDER_KEYS = [
  { value: "okta", labelKey: "enterprise.sso.providerOkta" },
  { value: "azure_ad", labelKey: "enterprise.sso.providerAzureAd" },
  { value: "onelogin", labelKey: "enterprise.sso.providerOnelogin" },
  { value: "custom_saml", labelKey: "enterprise.sso.providerCustomSaml" },
] as const;

export default function SsoConfig() {
  const { t } = useTranslation();
  const { settings, loading, saving, updateSettings } = useEnterprise();
  const { toast } = useToast();

  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [provider, setProvider] = useState<string>("");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [certificate, setCertificate] = useState("");
  const [entityId, setEntityId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Sync local state from settings
  useEffect(() => {
    if (settings) {
      setSsoEnabled(settings.sso_enabled);
      setProvider(settings.sso_provider ?? "");
      setMetadataUrl(settings.sso_metadata_url ?? "");
      setCertificate(settings.sso_certificate ?? "");
      setEntityId(settings.sso_entity_id ?? "");
    }
  }, [settings]);

  async function handleSave() {
    const { error } = await updateSettings({
      sso_enabled: ssoEnabled,
      sso_provider: provider || null,
      sso_metadata_url: metadataUrl.trim() || null,
      sso_certificate: certificate.trim() || null,
      sso_entity_id: entityId.trim() || null,
    });

    if (error) {
      toast({ title: t("enterprise.sso.saveFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("enterprise.sso.saved"), description: t("enterprise.sso.savedDescription") });
    }
  }

  async function handleTestConnection() {
    if (!metadataUrl.trim()) {
      toast({ title: t("enterprise.sso.testFailed"), description: t("enterprise.sso.metadataRequired"), variant: "destructive" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Validate the metadata URL is reachable
      const response = await fetch(metadataUrl.trim(), { method: "HEAD", mode: "no-cors" });
      // no-cors won't give us the status, but if it doesn't throw, the URL is reachable
      setTestResult("success");
      toast({ title: t("enterprise.sso.testSuccess"), description: t("enterprise.sso.testSuccessDescription") });
    } catch {
      setTestResult("error");
      toast({ title: t("enterprise.sso.testFailed"), description: t("enterprise.sso.testFailedDescription"), variant: "destructive" });
    } finally {
      setTesting(false);
    }
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
    <FeatureGate feature="sso" requiredPlan="business" featureName={t("enterprise.sso.title")}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("enterprise.sso.title")}</CardTitle>
              <CardDescription>{t("enterprise.sso.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{t("enterprise.sso.enableSso")}</p>
              <p className="text-sm text-muted-foreground">{t("enterprise.sso.enableSsoDescription")}</p>
            </div>
            <Switch checked={ssoEnabled} onCheckedChange={setSsoEnabled} />
          </div>

          {ssoEnabled && (
            <>
              {/* SSO Provider */}
              <div className="space-y-2">
                <Label>{t("enterprise.sso.provider")}</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("enterprise.sso.selectProvider")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SSO_PROVIDER_KEYS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {t(p.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SAML Metadata URL */}
              <div className="space-y-2">
                <Label htmlFor="metadata-url">{t("enterprise.sso.metadataUrl")}</Label>
                <Input
                  id="metadata-url"
                  type="url"
                  placeholder="https://your-idp.com/app/metadata"
                  value={metadataUrl}
                  onChange={(e) => setMetadataUrl(e.target.value)}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">{t("enterprise.sso.metadataUrlHint")}</p>
              </div>

              {/* Entity ID */}
              <div className="space-y-2">
                <Label htmlFor="entity-id">{t("enterprise.sso.entityId")}</Label>
                <Input
                  id="entity-id"
                  placeholder="https://formforge.app/saml/metadata"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">{t("enterprise.sso.entityIdHint")}</p>
              </div>

              {/* Certificate */}
              <div className="space-y-2">
                <Label htmlFor="certificate">{t("enterprise.sso.certificate")}</Label>
                <Textarea
                  id="certificate"
                  rows={6}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  value={certificate}
                  onChange={(e) => setCertificate(e.target.value)}
                  className="font-mono text-xs"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">{t("enterprise.sso.certificateHint")}</p>
              </div>

              {/* Test Connection */}
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleTestConnection} disabled={testing || !metadataUrl.trim()}>
                  {testing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("enterprise.sso.testConnection")}
                </Button>
                {testResult === "success" && (
                  <Badge variant="secondary" className="gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> {t("enterprise.sso.reachable")}
                  </Badge>
                )}
                {testResult === "error" && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> {t("enterprise.sso.unreachable")}
                  </Badge>
                )}
              </div>
            </>
          )}

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {saving ? t("common.saving") : t("common.saveChanges")}
          </Button>
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
