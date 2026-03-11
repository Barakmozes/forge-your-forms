// ============================================
// OnboardingWizard — Main 3-step onboarding flow (Agent 8)
// Step 1: ModeSelector, Step 2: FirstFormGuide, Step 3: GuidedTour
// ============================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/AuthContext";
import { sendEmail } from "@/lib/emailTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Hammer } from "lucide-react";
import ModeSelector from "@/components/onboarding/ModeSelector";
import FirstFormGuide from "@/components/onboarding/FirstFormGuide";
import GuidedTour from "@/components/onboarding/GuidedTour";

type FormMode = "standard" | "waitlist" | "feedback" | "support";

const TOTAL_STEPS = 3;

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, isLoading, completeOnboarding, skipOnboarding, logActivationEvent } = useOnboarding();

  const [step, setStep] = useState(1);
  const [selectedModes, setSelectedModes] = useState<FormMode[]>([]);
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);

  // Redirect if already onboarded
  useEffect(() => {
    if (!isLoading && !authLoading && isOnboarded) {
      navigate("/", { replace: true });
    }
  }, [isOnboarded, isLoading, authLoading, navigate]);

  // Log onboarding_started on mount + send welcome email
  useEffect(() => {
    if (user && !isLoading && !isOnboarded) {
      logActivationEvent("onboarding_started");
      // Send welcome email (fire-and-forget)
      const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
      sendEmail("welcome", user.email || "", {
        userName,
        dashboardUrl: window.location.origin,
      }).catch(() => {
        // Welcome email is best-effort, don't block onboarding
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, isOnboarded]);

  const handleToggleMode = (mode: FormMode) => {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const handleFormCreated = (formId: string) => {
    setCreatedFormId(formId);
    logActivationEvent("first_form_created", { formId });
  };

  const handleFinish = async () => {
    await completeOnboarding();
    navigate("/", { replace: true });
  };

  const handleSkip = async () => {
    await skipOnboarding();
    navigate("/", { replace: true });
  };

  const canGoNext = () => {
    if (step === 1) return selectedModes.length > 0;
    return true;
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-subtle px-4 py-8">
      <Card className="w-full max-w-lg shadow-lg border-border/50">
        <CardContent className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Hammer className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-sm">FormForge</span>
            </div>
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("onboarding.skip")}
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i + 1 === step
                    ? "w-8 bg-emerald-500"
                    : i + 1 < step
                    ? "w-2 bg-emerald-500"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          {step === 1 && (
            <ModeSelector selectedModes={selectedModes} onToggleMode={handleToggleMode} />
          )}
          {step === 2 && (
            <FirstFormGuide selectedModes={selectedModes} onFormCreated={handleFormCreated} />
          )}
          {step === 3 && <GuidedTour />}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            {step > 1 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4 me-1" />
                {t("common.back")}
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canGoNext()}>
                {t("common.next")}
                <ArrowRight className="h-4 w-4 ms-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish}>
                {t("onboarding.finish")}
              </Button>
            )}
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            {t("onboarding.stepOf", { current: step, total: TOTAL_STEPS })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
