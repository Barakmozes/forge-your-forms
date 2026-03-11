// ============================================
// FirstFormGuide — Step 2 of onboarding wizard (Agent 8)
// Creates a template form based on the selected mode
// ============================================

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, MessageSquare, Headphones, Check, Loader2 } from "lucide-react";

type FormMode = "standard" | "waitlist" | "feedback" | "support";

interface FirstFormGuideProps {
  selectedModes: FormMode[];
  onFormCreated: (formId: string) => void;
}

const MODE_ICONS: Record<FormMode, typeof FileText> = {
  standard: FileText,
  waitlist: Users,
  feedback: MessageSquare,
  support: Headphones,
};

const TEMPLATE_CONFIGS: Record<FormMode, { titleKey: string; descKey: string; fieldLabelKeys: { id: string; type: string; labelKey: string; required: boolean }[] }> = {
  standard: {
    titleKey: "onboarding.template_standard_title",
    descKey: "onboarding.template_standard_desc",
    fieldLabelKeys: [
      { id: "name", type: "text", labelKey: "forms.templateFieldFullName", required: true },
      { id: "email", type: "email", labelKey: "forms.templateFieldEmail", required: true },
      { id: "message", type: "textarea", labelKey: "forms.templateFieldMessage", required: false },
    ],
  },
  waitlist: {
    titleKey: "onboarding.template_waitlist_title",
    descKey: "onboarding.template_waitlist_desc",
    fields: [],
  },
  feedback: {
    titleKey: "onboarding.template_feedback_title",
    descKey: "onboarding.template_feedback_desc",
    fields: [],
  },
  support: {
    titleKey: "onboarding.template_support_title",
    descKey: "onboarding.template_support_desc",
    fields: [],
  },
};

export default function FirstFormGuide({ selectedModes, onFormCreated }: FirstFormGuideProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const primaryMode = selectedModes[0] || "standard";
  const config = TEMPLATE_CONFIGS[primaryMode];
  const Icon = MODE_ICONS[primaryMode];

  // Translate field labels at runtime so they match the current locale
  const translatedFields = useMemo(
    () => config.fieldLabelKeys.map(({ id, type, labelKey, required }) => ({
      id, type, label: t(labelKey), required,
    })),
    [config.fieldLabelKeys, t]
  );

  const handleCreateForm = async () => {
    if (!user || !currentWorkspace) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("forms")
      .insert({
        workspace_id: currentWorkspace.id,
        created_by: user.id,
        title: t(config.titleKey),
        description: t(config.descKey),
        mode: primaryMode,
        fields: translatedFields,
        status: "draft",
      })
      .select("id")
      .single();

    setCreating(false);

    if (!error && data) {
      setCreated(true);
      onFormCreated(data.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold">{t("onboarding.createFirstForm")}</h2>
        <p className="text-muted-foreground text-sm">{t("onboarding.createFirstFormDesc")}</p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{t(config.titleKey)}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t(config.descKey)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedModes.map((mode) => (
                  <span key={mode} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {t(`onboarding.mode_${mode}`)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            {created ? (
              <div className="flex items-center gap-2 text-emerald-600 font-medium">
                <Check className="h-5 w-5" />
                {t("onboarding.formCreated")}
              </div>
            ) : (
              <Button
                onClick={handleCreateForm}
                disabled={creating || !currentWorkspace}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t("onboarding.creatingForm")}
                  </>
                ) : (
                  t("onboarding.createThisForm")
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
