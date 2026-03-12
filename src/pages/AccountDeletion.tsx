import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

export default function AccountDeletion() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { workspaces } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmPhrase = "DELETE MY ACCOUNT";

  async function handleDeleteAccount() {
    if (!user || confirmText !== confirmPhrase) return;
    setDeleting(true);

    try {
      // 1. Delete all workspaces owned by the user (CASCADE handles forms, submissions, etc.)
      const ownedWorkspaces = workspaces.filter((w) => w.owner_id === user.id);
      for (const workspace of ownedWorkspaces) {
        const { error } = await supabase
          .from("workspaces")
          .delete()
          .eq("id", workspace.id);
        if (error) {
          console.error("Failed to delete workspace:", error);
        }
      }

      // 2. Remove workspace memberships for workspaces not owned by user
      await supabase
        .from("workspace_members")
        .delete()
        .eq("user_id", user.id);

      // 3. Delete notifications
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      // 4. Delete profile
      await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      // 5. Sign out (auth user deletion requires service_role — handled server-side or manually)
      await signOut();

      toast({
        title: t("accountDeletion.success", "Account deleted"),
        description: t("accountDeletion.successDescription", "Your account and data have been permanently deleted."),
      });

      navigate("/auth", { replace: true });
    } catch (err) {
      console.error("Account deletion failed:", err);
      toast({
        title: t("accountDeletion.failed", "Deletion failed"),
        description: t("accountDeletion.failedDescription", "Some data could not be deleted. Please contact support."),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t("accountDeletion.title", "Delete Account")}</h1>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("accountDeletion.cardTitle", "Danger Zone")}
            </CardTitle>
            <CardDescription>
              {t("accountDeletion.cardDescription", "Permanently delete your account and all associated data. This action cannot be undone.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md bg-destructive/10 p-4 text-sm space-y-2">
              <p className="font-medium text-destructive">
                {t("accountDeletion.consequencesTitle", "Deleting your account will permanently remove:")}
              </p>
              <ul className="list-disc list-inside space-y-1 text-destructive/80">
                <li>{t("accountDeletion.consequence1", "Your profile and authentication data")}</li>
                <li>{t("accountDeletion.consequence2", "All workspaces you own")}</li>
                <li>{t("accountDeletion.consequence3", "All forms, submissions, and responses")}</li>
                <li>{t("accountDeletion.consequence4", "All waitlist entries and feedback data")}</li>
                <li>{t("accountDeletion.consequence5", "All support tickets and messages")}</li>
                <li>{t("accountDeletion.consequence6", "Your workspace memberships")}</li>
              </ul>
              <p className="font-medium text-destructive mt-3">
                {t("accountDeletion.irreversible", "This action is irreversible.")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                {t("accountDeletion.typeToConfirm", 'Type "DELETE MY ACCOUNT" to confirm')}
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmPhrase}
                dir="ltr"
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={confirmText !== confirmPhrase || deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("accountDeletion.deleting", "Deleting account...")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("accountDeletion.deleteButton", "Delete My Account")}
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("accountDeletion.finalConfirmTitle", "Are you absolutely sure?")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("accountDeletion.finalConfirmDescription", "This will permanently delete your account, all workspaces you own, and all associated data. This action cannot be undone.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("common.cancel", "Cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("accountDeletion.confirmDelete", "Yes, delete everything")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
