import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { FormRenderer, FormField } from "@/components/FormRenderer";
import type { FormSettings } from "@/components/builder/FormSettingsPanel";
import type { FormBranding } from "@/components/builder/BrandingPanel";
import { FileText, AlertCircle } from "lucide-react";
import WaitlistLandingPage from "@/components/waitlist/WaitlistLandingPage";
import FeedbackSurveyPage from "@/components/feedback/FeedbackSurveyPage";
import SupportSubmitPage from "@/components/support/SupportSubmitPage";
import type { Database } from "@/integrations/supabase/types";

type FormMode = Database["public"]["Enums"]["form_mode"];

interface FormData {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  status: string;
  mode: FormMode;
  branding: Record<string, string> | null;
  settings: Record<string, unknown> | null;
}

export default function PublicForm() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("forms")
      .select("id, title, description, fields, status, mode, branding, settings")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setForm({
            ...data,
            fields: Array.isArray(data.fields) ? (data.fields as unknown as FormField[]) : [],
            mode: (data.mode ?? "standard") as FormMode,
            branding: data.branding as Record<string, string> | null,
            settings: data.settings as Record<string, unknown> | null,
          });
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">{t("forms.formNotFound")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("forms.formNotFoundDesc")}
          </p>
        </div>
      </div>
    );
  }

  if (form.status === "closed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("forms.formClosed")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("forms.formClosedDesc")}
          </p>
        </div>
      </div>
    );
  }

  if (form.status === "draft") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("forms.formDraft")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("forms.formDraftDesc")}
          </p>
        </div>
      </div>
    );
  }

  // Mode-specific rendering
  if (form.mode === "waitlist") {
    return (
      <WaitlistLandingPage
        formId={form.id}
        title={form.title}
        description={form.description}
        branding={form.branding}
        settings={form.settings}
        referralCode={searchParams.get("ref") ?? undefined}
      />
    );
  }

  if (form.mode === "feedback") {
    return (
      <FeedbackSurveyPage
        formId={form.id}
        title={form.title}
        description={form.description}
        branding={form.branding}
        settings={form.settings}
        fields={form.fields}
      />
    );
  }

  if (form.mode === "support") {
    return (
      <SupportSubmitPage
        formId={form.id}
        title={form.title}
        description={form.description}
        branding={form.branding}
        settings={form.settings}
      />
    );
  }

  // Default: standard form
  const formBranding = form.branding as FormBranding | null;
  const pageStyle: React.CSSProperties = {
    ...(formBranding?.backgroundColor ? { backgroundColor: formBranding.backgroundColor } : {}),
    ...(formBranding?.font ? { fontFamily: formBranding.font } : {}),
  };

  return (
    <div className="min-h-screen bg-background" style={pageStyle}>
      <div className="h-1 w-full" style={{ backgroundColor: formBranding?.primaryColor ?? "hsl(var(--primary))" }} />
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <div className="mb-10 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            {formBranding?.logoUrl ? (
              <img src={formBranding.logoUrl} alt="" className="h-10 object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-muted-foreground text-base leading-relaxed">
              {form.description}
            </p>
          )}
        </div>
        <div className="h-px bg-border mb-10" />
        {form.fields.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">{t("forms.noFieldsYet")}</p>
          </div>
        ) : (
          <FormRenderer
            fields={form.fields}
            formId={form.id}
            isPreview={false}
            settings={form.settings as FormSettings}
            branding={form.branding as FormBranding}
          />
        )}
        {(form.branding as FormBranding)?.showPoweredBy !== false && (
          <div className="mt-12 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              {t("common.poweredBy")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
