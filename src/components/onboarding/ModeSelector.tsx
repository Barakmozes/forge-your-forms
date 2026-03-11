// ============================================
// ModeSelector — Step 1 of onboarding wizard (Agent 8)
// User selects which mode(s) they want to use
// ============================================

import { useTranslation } from "react-i18next";
import { FileText, Users, MessageSquare, Headphones, Check } from "lucide-react";

type FormMode = "standard" | "waitlist" | "feedback" | "support";

interface ModeSelectorProps {
  selectedModes: FormMode[];
  onToggleMode: (mode: FormMode) => void;
}

const MODES: { mode: FormMode; icon: typeof FileText; colorClass: string }[] = [
  { mode: "standard", icon: FileText, colorClass: "border-blue-500 bg-blue-500/10 ring-blue-500/30" },
  { mode: "waitlist", icon: Users, colorClass: "border-purple-500 bg-purple-500/10 ring-purple-500/30" },
  { mode: "feedback", icon: MessageSquare, colorClass: "border-amber-500 bg-amber-500/10 ring-amber-500/30" },
  { mode: "support", icon: Headphones, colorClass: "border-emerald-500 bg-emerald-500/10 ring-emerald-500/30" },
];

export default function ModeSelector({ selectedModes, onToggleMode }: ModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold">{t("onboarding.whatDoYouNeed")}</h2>
        <p className="text-muted-foreground text-sm">{t("onboarding.selectModes")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODES.map(({ mode, icon: Icon, colorClass }) => {
          const isSelected = selectedModes.includes(mode);
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onToggleMode(mode)}
              className={`relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 transition-all text-start ${
                isSelected
                  ? `${colorClass} ring-2 ring-offset-2`
                  : "border-border hover:border-muted-foreground/40 bg-card"
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 end-3 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t(`onboarding.mode_${mode}`)}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t(`onboarding.mode_${mode}_desc`)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
