// ============================================
// GuidedTour — Step 3 of onboarding wizard (Agent 8)
// Quick tips showing Dashboard, Form Builder, and Sharing
// ============================================

import { useTranslation } from "react-i18next";
import { LayoutDashboard, PenLine, Share2, Rocket } from "lucide-react";

const TIPS = [
  { icon: LayoutDashboard, titleKey: "onboarding.tip_dashboard_title", descKey: "onboarding.tip_dashboard_desc" },
  { icon: PenLine, titleKey: "onboarding.tip_builder_title", descKey: "onboarding.tip_builder_desc" },
  { icon: Share2, titleKey: "onboarding.tip_sharing_title", descKey: "onboarding.tip_sharing_desc" },
];

export default function GuidedTour() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <Rocket className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-display font-bold">{t("onboarding.allSet")}</h2>
        <p className="text-muted-foreground text-sm">{t("onboarding.quickTips")}</p>
      </div>

      <div className="space-y-3">
        {TIPS.map(({ icon: Icon, titleKey, descKey }, index) => (
          <div
            key={titleKey}
            className="flex items-start gap-4 p-4 rounded-lg border bg-card"
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10 shrink-0">
              <Icon className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-sm">
                <span className="text-emerald-600 me-1.5">{index + 1}.</span>
                {t(titleKey)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
