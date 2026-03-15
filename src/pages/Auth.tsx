import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { validatePassword } from "@/lib/passwordValidation";
import { Hammer, Mail, KeyRound } from "lucide-react";

type AuthView = "login" | "signup" | "forgotPassword" | "pendingVerification" | "pendingReset";

const RESEND_COOLDOWN_SECONDS = 60;

export default function Auth() {
  const { t } = useTranslation();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Handle redirects from expired links
  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      setView("pendingVerification");
    } else if (searchParams.get("resetExpired") === "1") {
      setView("forgotPassword");
      toast({
        title: t("auth.authError"),
        description: t("auth.otpExpired"),
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Cooldown timer
  const cooldownActive = resendCooldown > 0;
  useEffect(() => {
    if (!cooldownActive) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldownActive]);

  const startCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }, []);

  const handleResendVerification = async () => {
    if (!email || resendCooldown > 0) return;
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      toast({ title: t("auth.resendFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.emailResent"), description: t("auth.confirmationSent") });
      startCooldown();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (view === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: t("auth.loginFailed"), description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    } else if (view === "signup") {
      const pwValidation = validatePassword(password);
      if (!pwValidation.valid) {
        toast({
          title: t("auth.weakPassword"),
          description: pwValidation.errors.join(" "),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: t("auth.signupFailed"), description: error.message, variant: "destructive" });
      } else {
        setView("pendingVerification");
        startCooldown();
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset-password",
    });
    setLoading(false);

    if (error) {
      toast({ title: t("auth.passwordUpdateFailed"), description: error.message, variant: "destructive" });
    } else {
      setView("pendingReset");
      startCooldown();
    }
  };

  const handleResendReset = async () => {
    if (!email || resendCooldown > 0) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset-password",
    });
    if (error) {
      toast({ title: t("auth.resetLinkResendFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.resetLinkResent"), description: t("auth.resetLinkSent") });
      startCooldown();
    }
  };

  const handleUseDifferentEmail = () => {
    setView("login");
    setEmail("");
    setPassword("");
    setFullName("");
    setResendCooldown(0);
  };

  // Pending verification card
  if (view === "pendingVerification") {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-subtle px-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">
              {t("auth.checkYourEmail")}
            </CardTitle>
            <CardDescription className="text-sm">
              {email ? (
                <Trans i18nKey="auth.verificationSentTo" values={{ email }}>
                  We sent a verification link to <strong className="text-foreground">{"{{email}}"}</strong>. Click the link in the email to verify your account.
                </Trans>
              ) : (
                t("auth.confirmationSent")
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleResendVerification}
              disabled={resendCooldown > 0 || !email}
              className="w-full"
              variant="outline"
            >
              {resendCooldown > 0
                ? t("auth.resendAvailableIn", { seconds: resendCooldown })
                : t("auth.resendVerification")}
            </Button>
            <div className="text-center">
              <button
                onClick={handleUseDifferentEmail}
                className="text-sm text-primary font-medium hover:underline"
              >
                {t("auth.useDifferentEmail")}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending reset card — "check your email" for password reset
  if (view === "pendingReset") {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-subtle px-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">
              {t("auth.checkYourEmail")}
            </CardTitle>
            <CardDescription className="text-sm">
              {email ? (
                <Trans i18nKey="auth.resetLinkSentDescription" values={{ email }}>
                  We sent a password reset link to <strong className="text-foreground">{"{{email}}"}</strong>. Click the link in the email to set a new password.
                </Trans>
              ) : (
                t("auth.resetLinkSent")
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleResendReset}
              disabled={resendCooldown > 0 || !email}
              className="w-full"
              variant="outline"
            >
              {resendCooldown > 0
                ? t("auth.resendAvailableIn", { seconds: resendCooldown })
                : t("auth.resendResetLink")}
            </Button>
            <div className="text-center">
              <button
                onClick={() => setView("login")}
                className="text-sm text-primary font-medium hover:underline"
              >
                {t("auth.backToLogin")}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password card
  if (view === "forgotPassword") {
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
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">{t("auth.email")}</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  required
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => setView("login")}
                className="text-sm text-primary font-medium hover:underline"
              >
                {t("auth.backToLogin")}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login / Signup form
  return (
    <div className="flex min-h-screen items-center justify-center gradient-subtle px-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-colored">
            <Hammer className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">
            {view === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
          </CardTitle>
          <CardDescription>
            {view === "login" ? t("auth.signInDescription") : t("auth.signUpDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {view === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("auth.fullNamePlaceholder")} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPlaceholder")} required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.passwordPlaceholder")} required minLength={8} dir="ltr" />
            </div>
            {view === "login" && (
              <div className="text-end">
                <button
                  type="button"
                  onClick={() => setView("forgotPassword")}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? (view === "login" ? t("auth.signingIn") : t("auth.signingUp"))
                : (view === "login" ? t("auth.signIn") : t("auth.signUp"))}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {view === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button
              onClick={() => setView(view === "login" ? "signup" : "login")}
              className="text-primary font-medium hover:underline"
            >
              {view === "login" ? t("auth.signUp") : t("auth.signIn")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
