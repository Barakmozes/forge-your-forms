import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import WaitlistDashboard from "@/components/waitlist/WaitlistDashboard";
import FeedbackDashboard from "@/components/feedback/FeedbackDashboard";
import SupportDashboard from "@/components/support/SupportDashboard";
// === AGENT 7: Mode Gating ===
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradePrompt from "@/components/upgrade/UpgradePrompt";
// === END AGENT 7 ===
import type { Database } from "@/integrations/supabase/types";

type FormMode = Database["public"]["Enums"]["form_mode"];

interface FormMeta {
  id: string;
  title: string;
  description: string | null;
  mode: FormMode;
  status: string;
  submission_count: number;
  settings: Record<string, unknown> | null;
}

export default function FormDashboard() {
  useDocumentTitle("Dashboard");
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormMeta | null>(null);
  const [loading, setLoading] = useState(true);
  // === AGENT 7: Mode Gating ===
  const { canAccessMode } = usePlanLimits();
  // === END AGENT 7 ===

  useEffect(() => {
    if (!id) return;
    supabase
      .from("forms")
      .select("id, title, description, mode, status, submission_count, settings")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate("/");
          return;
        }
        setForm({
          ...data,
          mode: (data.mode ?? "standard") as FormMode,
          settings: data.settings as Record<string, unknown> | null,
        });
        setLoading(false);
      });
  }, [id, navigate]);

  if (loading || !form) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">{t("common.loading")}</div>
      </AppLayout>
    );
  }

  // Route to mode-specific dashboard
  const renderDashboard = () => {
    // === AGENT 7: Mode Gating ===
    if (form.mode === "feedback" && !canAccessMode("feedback")) {
      return <UpgradePrompt requiredPlan="pro" featureName={t("upgrade.feedbackMode")} />;
    }
    if (form.mode === "support" && !canAccessMode("support")) {
      return <UpgradePrompt requiredPlan="growth" featureName={t("upgrade.supportMode")} />;
    }
    // === END AGENT 7 ===

    switch (form.mode) {
      case "waitlist":
        return <WaitlistDashboard formId={form.id} formTitle={form.title} formStatus={form.status} />;
      case "feedback":
        return <FeedbackDashboard formId={form.id} formTitle={form.title} formStatus={form.status} />;
      case "support":
        return <SupportDashboard formId={form.id} formTitle={form.title} formStatus={form.status} />;
      default:
        // Standard forms go to builder — use <Navigate> instead of navigate() to avoid side-effect during render
        return <Navigate to={`/forms/${form.id}/edit`} replace />;
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">{form.title}</h1>
          <p className="text-muted-foreground text-sm">{t("upgrade.modeDashboard", { mode: form.mode })}</p>
        </div>
      </div>
      {renderDashboard()}
    </AppLayout>
  );
}
