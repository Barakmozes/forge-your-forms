import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Hammer } from "lucide-react";

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
        toast({ title: t("auth.checkEmail"), description: t("auth.confirmationSent") });
      }
    }
    setLoading(false);
  };

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
