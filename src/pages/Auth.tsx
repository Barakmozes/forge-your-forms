import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Hammer, Mail } from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 60;

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // If redirected from expired link, show verification card with resend
  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      setPendingVerification(true);
      setIsLogin(false);
    }
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

  const handleResend = async () => {
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

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: t("auth.loginFailed"), description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    } else {
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
        setPendingVerification(true);
        startCooldown();
      }
    }
    setLoading(false);
  };

  const handleUseDifferentEmail = () => {
    setPendingVerification(false);
    setEmail("");
    setPassword("");
    setFullName("");
    setResendCooldown(0);
  };

  // Verification pending card
  if (pendingVerification) {
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
              onClick={handleResend}
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

  return (
    <div className="flex min-h-screen items-center justify-center gradient-subtle px-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-colored">
            <Hammer className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </CardTitle>
          <CardDescription>
            {isLogin ? t("auth.signInDescription") : t("auth.signUpDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
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
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.passwordPlaceholder")} required minLength={6} dir="ltr" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isLogin ? t("auth.signingIn") : t("auth.signingUp")) : isLogin ? t("auth.signIn") : t("auth.signUp")}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? t("auth.signUp") : t("auth.signIn")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
