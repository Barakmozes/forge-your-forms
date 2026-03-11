// ============================================
// PoweredByEnforcer — shows "Powered by FormForge" footer on public forms (Agent 7)
// Forces display on Free plan regardless of branding settings.
// ============================================

import { useTranslation } from "react-i18next";

interface PoweredByEnforcerProps {
  showPoweredBy?: boolean;
  plan?: string;
}

export default function PoweredByEnforcer({ showPoweredBy, plan }: PoweredByEnforcerProps) {
  const { t } = useTranslation();

  // Business plan: never show branding
  if (plan === "business") return null;

  // Free plan: always show branding regardless of setting
  // Paid plans: respect the setting
  const shouldShow = plan === "free" || (showPoweredBy !== false);

  if (!shouldShow) return null;

  return (
    <div className="mt-12 pt-6 border-t text-center">
      <p className="text-xs text-muted-foreground">
        {t("common.poweredBy")}
      </p>
    </div>
  );
}
