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
        title: t("gdpr.accountDeletion.success"),
        description: t("gdpr.accountDeletion.successDescription"),
      });

      navigate("/auth", { replace: true });
    } catch (err) {
      console.error("Account deletion failed:", err);
      toast({
        title: t("gdpr.accountDeletion.failed"),
        description: t("gdpr.accountDeletion.failedDescription"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t("gdpr.accountDeletion.title")}</h1>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("gdpr.accountDeletion.cardTitle")}
            </CardTitle>
            <CardDescription>
              {t("gdpr.accountDeletion.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md bg-destructive/10 p-4 text-sm space-y-2">
              <p className="font-medium text-destructive">
                {t("gdpr.accountDeletion.consequencesTitle")}
              </p>
              <ul className="list-disc ps-5 space-y-1 text-destructive/80">
                <li>{t("gdpr.accountDeletion.consequence1")}</li>
                <li>{t("gdpr.accountDeletion.consequence2")}</li>
                <li>{t("gdpr.accountDeletion.consequence3")}</li>
                <li>{t("gdpr.accountDeletion.consequence4")}</li>
                <li>{t("gdpr.accountDeletion.consequence5")}</li>
                <li>{t("gdpr.accountDeletion.consequence6")}</li>
              </ul>
              <p className="font-medium text-destructive mt-3">
                {t("gdpr.accountDeletion.irreversible")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                {t("gdpr.accountDeletion.typeToConfirm")}
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
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t("gdpr.accountDeletion.deleting")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="me-2 h-4 w-4" />
                      {t("gdpr.accountDeletion.deleteButton")}
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("gdpr.accountDeletion.finalConfirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("gdpr.accountDeletion.finalConfirmDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("common.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("gdpr.accountDeletion.confirmDelete")}
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
