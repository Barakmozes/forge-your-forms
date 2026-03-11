import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import { FormRenderer, FormField } from "@/components/FormRenderer";
import type { FormSettings } from "@/components/builder/FormSettingsPanel";
import type { FormBranding } from "@/components/builder/BrandingPanel";

interface FormData {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  status: string;
  settings: FormSettings;
  branding: FormBranding;
}

export default function FormPreview() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("forms")
      .select("id, title, description, fields, status, settings, branding")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate("/");
          return;
        }
        setForm({
          ...data,
          fields: Array.isArray(data.fields) ? (data.fields as unknown as FormField[]) : [],
          settings: (data.settings as FormSettings) ?? {},
          branding: (data.branding as FormBranding) ?? {},
        });
        setLoading(false);
      });
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">{t("forms.loadingPreview")}</div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4" />
            <span>{t("forms.previewMode")}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-8 text-xs"
            onClick={() => navigate(`/forms/${id}/edit`)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("forms.backToEditor")}
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        {/* Form Header */}
        <div className="mb-10 space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-muted-foreground text-base leading-relaxed">
              {form.description}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-10" />

        {/* Form Fields */}
        {form.fields.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">{t("forms.noFieldsAddedYet")}</p>
          </div>
        ) : (
          <FormRenderer
            fields={form.fields}
            formId={form.id}
            isPreview={true}
            settings={form.settings}
            branding={form.branding}
          />
        )}
      </div>
    </div>
  );
}
