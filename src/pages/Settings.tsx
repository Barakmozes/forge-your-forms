import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import AppLayout from "@/components/AppLayout";
import MembersManager from "@/components/MembersManager";
// === AGENT 6: Billing Tab ===
import BillingPortal from "@/components/billing/BillingPortal";
// === END AGENT 6 ===
// === AGENT 7: Usage Dashboard ===
import UsageDashboard from "@/components/upgrade/UsageDashboard";
// === END AGENT 7 ===
// === AGENT 9: Webhooks Tab ===
import WebhookManager from "@/components/webhooks/WebhookManager";
// === END AGENT 9 ===
// === AGENT 9: API Tab ===
import ApiKeyManager from "@/components/api/ApiKeyManager";
import ApiDocs from "@/components/api/ApiDocs";
// === END AGENT 9 ===
// === AGENT 10: Integrations Tab ===
import IntegrationManager from "@/components/integrations/IntegrationManager";
// === END AGENT 10 ===
// === AGENT 14: Enterprise Tab ===
import SsoConfig from "@/components/enterprise/SsoConfig";
import WhiteLabelConfig from "@/components/enterprise/WhiteLabelConfig";
import CustomDomainConfig from "@/components/enterprise/CustomDomainConfig";
// === END AGENT 14 ===
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Users, User, CreditCard, Webhook, Code, Plug, ShieldCheck } from "lucide-react";

export default function Settings() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleAsync } = useErrorHandler();

  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "workspace";
  const isOwner = currentWorkspace?.owner_id === user?.id;

  // Workspace tab state
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  // Profile tab state
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      supabase
        .from("workspaces")
        .select("slug")
        .eq("id", currentWorkspace.id)
        .single()
        .then(({ data }) => {
          setWorkspaceSlug(data?.slug ?? "");
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (user) {
      setProfileEmail(user.email ?? "");
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setFullName(data?.full_name ?? "");
          setAvatarUrl(data?.avatar_url ?? null);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSaveWorkspace() {
    if (!currentWorkspace || !isOwner) return;
    setSavingWorkspace(true);

    const result = await handleAsync(
      async () => {
        const { error } = await supabase
          .from("workspaces")
          .update({ name: workspaceName.trim() })
          .eq("id", currentWorkspace.id);
        if (error) throw error;
        return true;
      },
      {
        context: { component: "Settings", action: "saveWorkspace" },
        errorMessage: t("settings.failedSaveWorkspace"),
      }
    );

    if (result) {
      toast({ title: t("settings.workspaceUpdated"), description: t("settings.workspaceNameSaved") });
    }
    setSavingWorkspace(false);
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSavingProfile(true);

    const result = await handleAsync(
      async () => {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: fullName.trim() || null })
          .eq("id", user.id);
        if (error) throw error;
        return true;
      },
      {
        context: { component: "Settings", action: "saveProfile" },
        errorMessage: t("settings.failedSaveProfile"),
      }
    );

    if (result) {
      toast({ title: t("settings.profileUpdated"), description: t("settings.profileSaved") });
    }
    setSavingProfile(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: t("settings.invalidFile"), description: t("settings.pleaseUploadImage"), variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("settings.fileTooLarge"), description: t("settings.maxSizeIs"), variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);

    const result = await handleAsync(
      async () => {
        const ext = file.name.split(".").pop();
        const filePath = `${user.id}/avatar.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", user.id);
        if (updateErr) throw updateErr;

        return publicUrl;
      },
      {
        context: { component: "Settings", action: "uploadAvatar" },
        errorMessage: t("settings.failedUploadAvatar"),
      }
    );

    if (result) {
      setAvatarUrl(result);
      toast({ title: t("settings.avatarUpdated") });
    }
    setUploadingAvatar(false);
  }

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profileEmail.charAt(0).toUpperCase();

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">{t("settings.title")}</h1>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="workspace" className="gap-2">
              <Building2 className="h-4 w-4" /> {t("settings.workspace")}
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" /> {t("settings.members")}
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> {t("settings.profile")}
            </TabsTrigger>
            {/* === AGENT 6: Billing Tab === */}
            {isOwner && (
              <TabsTrigger value="billing" className="gap-2">
                <CreditCard className="h-4 w-4" /> {t("billing.billingTab")}
              </TabsTrigger>
            )}
            {/* === END AGENT 6 === */}
            {/* === AGENT 9: Webhooks Tab === */}
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" /> {t("webhooks.title")}
            </TabsTrigger>
            {/* === END AGENT 9 === */}
            {/* === AGENT 9: API Tab === */}
            <TabsTrigger value="api" className="gap-2">
              <Code className="h-4 w-4" /> {t("api.title")}
            </TabsTrigger>
            {/* === END AGENT 9 === */}
            {/* === AGENT 10: Integrations Tab === */}
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="h-4 w-4" /> {t("integrations.title")}
            </TabsTrigger>
            {/* === END AGENT 10 === */}
            {/* === AGENT 14: Enterprise Tab === */}
            {isOwner && (
              <TabsTrigger value="enterprise" className="gap-2">
                <ShieldCheck className="h-4 w-4" /> {t("enterprise.title")}
              </TabsTrigger>
            )}
            {/* === END AGENT 14 === */}
          </TabsList>

          {/* Workspace Tab */}
          <TabsContent value="workspace">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.workspaceSettings")}</CardTitle>
                <CardDescription>{t("settings.workspaceDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ws-name">{t("settings.workspaceName")}</Label>
                  <Input
                    id="ws-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    disabled={!isOwner}
                  />
                  {!isOwner && (
                    <p className="text-xs text-muted-foreground">{t("settings.ownerOnly")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-slug">{t("settings.slug")}</Label>
                  <Input id="ws-slug" value={workspaceSlug} disabled className="bg-muted" dir="ltr" />
                  <p className="text-xs text-muted-foreground">{t("settings.readOnlyIdentifier")}</p>
                </div>
                {isOwner && (
                  <Button onClick={handleSaveWorkspace} disabled={savingWorkspace || !workspaceName.trim()}>
                    {savingWorkspace ? t("common.saving") : t("common.saveChanges")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.teamMembers")}</CardTitle>
                <CardDescription>{t("settings.teamMembersDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <MembersManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* === AGENT 6: Billing Tab === */}
          {isOwner && (
            <TabsContent value="billing" className="space-y-6">
              <BillingPortal />
              {/* === AGENT 7: Usage Dashboard === */}
              <UsageDashboard />
              {/* === END AGENT 7 === */}
            </TabsContent>
          )}
          {/* === END AGENT 6 === */}

          {/* === AGENT 9: Webhooks Tab === */}
          <TabsContent value="webhooks">
            <WebhookManager />
          </TabsContent>
          {/* === END AGENT 9 === */}

          {/* === AGENT 9: API Tab === */}
          <TabsContent value="api" className="space-y-6">
            <ApiKeyManager />
            <ApiDocs />
          </TabsContent>
          {/* === END AGENT 9 === */}

          {/* === AGENT 10: Integrations Tab === */}
          <TabsContent value="integrations">
            <IntegrationManager />
          </TabsContent>
          {/* === END AGENT 10 === */}

          {/* === AGENT 14: Enterprise Tab === */}
          {isOwner && (
            <TabsContent value="enterprise" className="space-y-6">
              <SsoConfig />
              <WhiteLabelConfig />
              <CustomDomainConfig />
            </TabsContent>
          )}
          {/* === END AGENT 14 === */}

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.yourProfile")}</CardTitle>
                <CardDescription>{t("settings.profileDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild disabled={uploadingAvatar}>
                        <span>{uploadingAvatar ? t("settings.uploading") : t("settings.changeAvatar")}</span>
                      </Button>
                    </Label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t("settings.maxFileSize")}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-name">{t("settings.fullName")}</Label>
                  <Input
                    id="profile-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("settings.fullNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">{t("settings.emailLabel")}</Label>
                  <Input id="profile-email" value={profileEmail} disabled className="bg-muted" dir="ltr" />
                  <p className="text-xs text-muted-foreground">{t("settings.emailCannotChange")}</p>
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? t("common.saving") : t("settings.saveProfile")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
