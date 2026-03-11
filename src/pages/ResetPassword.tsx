import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, AlertTriangle } from "lucide-react";

export default function ResetPassword() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: t("common.error"), description: t("auth.passwordTooShort"), variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t("common.error"), description: t("auth.passwordsDoNotMatch"), variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: t("auth.passwordUpdateFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.passwordUpdated"), description: t("auth.passwordUpdatedDescription") });
      setTimeout(() => navigate("/", { replace: true }), 2000);
    }
  };

  // Loading state while auth context initializes
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  // No user session — link is invalid or expired
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-subtle px-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-display">
              {t("auth.invalidResetSession")}
            </CardTitle>
            <CardDescription>
              {t("auth.invalidResetSessionDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/auth">{t("auth.requestNewResetLink")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid session — show password update form
  return (
    <div className="flex min-h-screen items-center justify-center gradient-subtle px-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">
            {t("auth.resetPassword")}
          </CardTitle>
          <CardDescription>
            {t("auth.resetPasswordDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("auth.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.newPasswordPlaceholder")}
                required
                minLength={6}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("auth.confirmPasswordPlaceholder")}
                required
                minLength={6}
                dir="ltr"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.updatingPassword") : t("auth.updatePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
