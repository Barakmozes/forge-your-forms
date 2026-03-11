// ============================================
// WhiteLabelConfig — Workspace-level white-label branding (Agent 14)
// ============================================

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useEnterprise } from "@/hooks/useEnterprise";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import FeatureGate from "@/components/upgrade/FeatureGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Paintbrush, Upload, Loader2, Eye } from "lucide-react";

export default function WhiteLabelConfig() {
  const { t } = useTranslation();
  const { settings, loading, saving, updateSettings } = useEnterprise();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(false);
  const [appName, setAppName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22c55e");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.white_label_enabled);
      setAppName(settings.custom_app_name ?? "");
      setPrimaryColor(settings.custom_primary_color ?? "#22c55e");
      setLogoUrl(settings.custom_logo_url ?? "");
      setFaviconUrl(settings.custom_favicon_url ?? "");
    }
  }, [settings]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: t("enterprise.whiteLabel.invalidFile"), variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("enterprise.whiteLabel.fileTooLarge"), variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${currentWorkspace.id}/white-label-logo.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("branding")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(filePath);
      setLogoUrl(urlData.publicUrl);
      toast({ title: t("enterprise.whiteLabel.logoUploaded") });
    } catch {
      toast({ title: t("enterprise.whiteLabel.uploadFailed"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const { error } = await updateSettings({
      white_label_enabled: enabled,
      custom_app_name: appName.trim() || null,
      custom_primary_color: primaryColor || null,
      custom_logo_url: logoUrl.trim() || null,
      custom_favicon_url: faviconUrl.trim() || null,
    });

    if (error) {
      toast({ title: t("enterprise.whiteLabel.saveFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("enterprise.whiteLabel.saved"), description: t("enterprise.whiteLabel.savedDescription") });
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
    <FeatureGate feature="white_label" requiredPlan="business" featureName={t("enterprise.whiteLabel.title")}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Paintbrush className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("enterprise.whiteLabel.title")}</CardTitle>
              <CardDescription>{t("enterprise.whiteLabel.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{t("enterprise.whiteLabel.enable")}</p>
              <p className="text-sm text-muted-foreground">{t("enterprise.whiteLabel.enableDescription")}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              {/* Custom App Name */}
              <div className="space-y-2">
                <Label htmlFor="app-name">{t("enterprise.whiteLabel.appName")}</Label>
                <Input
                  id="app-name"
                  placeholder="Your Company"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("enterprise.whiteLabel.appNameHint")}</p>
              </div>

              {/* Custom Primary Color */}
              <div className="space-y-2">
                <Label>{t("enterprise.whiteLabel.primaryColor")}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border border-input"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="max-w-[150px] font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Custom Logo Upload */}
              <div className="space-y-2">
                <Label>{t("enterprise.whiteLabel.logo")}</Label>
                <div className="flex items-center gap-4">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded object-contain border" />
                  )}
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild disabled={uploading}>
                      <span>
                        {uploading ? (
                          <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="me-2 h-4 w-4" />
                        )}
                        {t("enterprise.whiteLabel.uploadLogo")}
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("enterprise.whiteLabel.logoHint")}</p>
              </div>

              {/* Custom Favicon URL */}
              <div className="space-y-2">
                <Label htmlFor="favicon-url">{t("enterprise.whiteLabel.favicon")}</Label>
                <Input
                  id="favicon-url"
                  type="url"
                  placeholder="https://example.com/favicon.ico"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">{t("enterprise.whiteLabel.faviconHint")}</p>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> {t("enterprise.whiteLabel.preview")}
                </Label>
                <div className="rounded-lg border p-4 bg-card">
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {(appName || "FF").charAt(0)}
                      </div>
                    )}
                    <span className="font-display font-bold text-lg" style={{ color: primaryColor }}>
                      {appName || "FormForge"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {saving ? t("common.saving") : t("common.saveChanges")}
          </Button>
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
