import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
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
import { AlertTriangle, Loader2, Trash2, CreditCard } from "lucide-react";

export default function AccountDeletion() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { workspaces } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const confirmPhrase = "DELETE MY ACCOUNT";

  // Check for active Stripe subscriptions to warn the user
  useEffect(() => {
    async function checkSubscriptions() {
      if (!user || !workspaces.length) return;
      const ownedIds = workspaces
        .filter((w) => w.owner_id === user.id)
        .map((w) => w.id);
      if (!ownedIds.length) return;

      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .in("workspace_id", ownedIds)
        .in("status", ["active", "trialing"]);

      setHasActiveSubscription(!!(data && data.length > 0));
    }
    checkSubscriptions();
  }, [user, workspaces]);

  async function handleDeleteAccount() {
    if (!user || confirmText !== confirmPhrase) return;
    setDeleting(true);

    try {
      // Call the delete-account edge function — atomically deletes all data and auth.users record
      // The function uses service_role to: delete owned workspaces (CASCADE), memberships,
      // notifications, profile, then auth.users via admin API.
      const { error } = await supabase.functions.invoke("delete-account");

      if (error) {
        throw new Error(error.message || t("gdpr.accountDeletion.failedDescription"));
      }

      // Sign out locally (auth session is now invalid)
      await signOut();

      // Only show success after all steps completed
      toast({
        title: t("gdpr.accountDeletion.success"),
        description: t("gdpr.accountDeletion.successDescription"),
      });

      navigate("/auth", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("gdpr.accountDeletion.failedDescription");
      toast({
        title: t("gdpr.accountDeletion.failed"),
        description: message,
        variant: "destructive",
      });
      // Do NOT navigate away — user needs to see the error and retry
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t("gdpr.accountDeletion.title")}</h1>

        {/* Active subscription warning */}
        {hasActiveSubscription && (
          <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t("gdpr.accountDeletion.activeSubscriptionWarning")}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {t("gdpr.accountDeletion.activeSubscriptionDescription")}{" "}
                    <Link
                      to="/settings?tab=billing"
                      className="underline hover:text-amber-900 dark:hover:text-amber-100"
                    >
                      {t("gdpr.accountDeletion.cancelSubscriptionLink")}
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
