import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

const ERROR_MESSAGES: Record<string, string> = {
  otp_expired: "auth.otpExpired",
  access_denied: "auth.accessDenied",
};

export function useAuthHashError() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("error=")) return;

    const params = new URLSearchParams(hash.replace("#", ""));
    const error = params.get("error");
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");

    if (!error) return;

    const i18nKey = (errorCode && ERROR_MESSAGES[errorCode]) || ERROR_MESSAGES[error];
    const message = i18nKey
      ? t(i18nKey)
      : errorDescription?.replace(/\+/g, " ") || t("auth.genericAuthError");

    toast({
      title: t("auth.authError"),
      description: message,
      variant: "destructive",
    });

    // Clear hash to prevent re-triggering
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    navigate("/auth?expired=1", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
