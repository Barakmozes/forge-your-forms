import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import AppLayout from "@/components/AppLayout";
import MembersManager from "@/components/MembersManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Users, User } from "lucide-react";

export default function Settings() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleAsync } = useErrorHandler();

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
      // Fetch workspace slug
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
        errorMessage: "Failed to save workspace settings.",
      }
    );

    if (result) {
      toast({ title: "Workspace updated", description: "Workspace name saved." });
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
        errorMessage: "Failed to save profile.",
      }
    );

    if (result) {
      toast({ title: "Profile updated", description: "Your profile has been saved." });
    }
    setSavingProfile(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 2MB.", variant: "destructive" });
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
        errorMessage: "Failed to upload avatar.",
      }
    );

    if (result) {
      setAvatarUrl(result);
      toast({ title: "Avatar updated" });
    }
    setUploadingAvatar(false);
  }

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profileEmail.charAt(0).toUpperCase();

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="workspace">
          <TabsList className="mb-6">
            <TabsTrigger value="workspace" className="gap-2">
              <Building2 className="h-4 w-4" /> Workspace
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" /> Members
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
          </TabsList>

          {/* Workspace Tab */}
          <TabsContent value="workspace">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Settings</CardTitle>
                <CardDescription>Manage your workspace details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ws-name">Workspace Name</Label>
                  <Input
                    id="ws-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    disabled={!isOwner}
                  />
                  {!isOwner && (
                    <p className="text-xs text-muted-foreground">Only the workspace owner can change the name.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-slug">Slug</Label>
                  <Input id="ws-slug" value={workspaceSlug} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Read-only identifier.</p>
                </div>
                {isOwner && (
                  <Button onClick={handleSaveWorkspace} disabled={savingWorkspace || !workspaceName.trim()}>
                    {savingWorkspace ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage who has access to this workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <MembersManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
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
                        <span>{uploadingAvatar ? "Uploading..." : "Change Avatar"}</span>
                      </Button>
                    </Label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Max 2MB. JPG, PNG, or GIF.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input id="profile-email" value={profileEmail} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
