// ============================================
// AiFormGenerator — "Create with AI" modal (Agent 12)
// Multi-step dialog: mode → prompt → preview → create
// Gated to Business plan via FeatureGate.
// ============================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useForms } from "@/hooks/useForms";
import { useAiGenerate } from "@/hooks/useAiGenerate";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  ClipboardList,
  Users,
  MessageSquare,
  Headphones,
  Loader2,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  LayoutTemplate,
} from "lucide-react";
import type { AiFormField } from "@/lib/ai";

type FormMode = "standard" | "waitlist" | "feedback" | "support";

interface AiFormGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, generates fields only (no form creation) and calls this callback */
  onFieldsGenerated?: (fields: AiFormField[], title: string, description: string) => void;
  /** Lock to a specific mode (used from FormBuilder) */
  fixedMode?: FormMode;
}

const MODE_OPTIONS: { mode: FormMode; icon: React.ElementType; labelKey: string; descKey: string }[] = [
  { mode: "standard", icon: ClipboardList, labelKey: "forms.modeStandard", descKey: "forms.modeStandardDesc" },
  { mode: "waitlist", icon: Users, labelKey: "forms.modeWaitlist", descKey: "forms.modeWaitlistDesc" },
  { mode: "feedback", icon: MessageSquare, labelKey: "forms.modeFeedback", descKey: "forms.modeFeedbackDesc" },
  { mode: "support", icon: Headphones, labelKey: "forms.modeSupport", descKey: "forms.modeSupportDesc" },
];

const PROMPT_EXAMPLE_KEYS: Record<FormMode, string[]> = {
  standard: [
    "ai.promptExampleStandard1",
    "ai.promptExampleStandard2",
    "ai.promptExampleStandard3",
  ],
  waitlist: [
    "ai.promptExampleWaitlist1",
    "ai.promptExampleWaitlist2",
  ],
  feedback: [
    "ai.promptExampleFeedback1",
    "ai.promptExampleFeedback2",
  ],
  support: [
    "ai.promptExampleSupport1",
    "ai.promptExampleSupport2",
  ],
};

const FIELD_TYPE_LABEL_KEYS: Record<string, string> = {
  text: "ai.fieldTypeText",
  textarea: "ai.fieldTypeLongText",
  number: "ai.fieldTypeNumber",
  email: "ai.fieldTypeEmail",
  phone: "ai.fieldTypePhone",
  date: "ai.fieldTypeDate",
  select: "ai.fieldTypeDropdown",
  multi_select: "ai.fieldTypeMultiSelect",
  checkbox: "ai.fieldTypeCheckboxes",
  radio: "ai.fieldTypeRadio",
  file_upload: "ai.fieldTypeFileUpload",
  section_header: "ai.fieldTypeSection",
  paragraph_text: "ai.fieldTypeParagraph",
};

export default function AiFormGenerator({
  open,
  onOpenChange,
  onFieldsGenerated,
  fixedMode,
}: AiFormGeneratorProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { createForm } = useForms();
  const { generate, fields, title, description, isLoading, error, rateLimited, reset } = useAiGenerate();
  const { toast } = useToast();

  const [step, setStep] = useState<"mode" | "prompt" | "preview">(fixedMode ? "prompt" : "mode");
  const [selectedMode, setSelectedMode] = useState<FormMode>(fixedMode ?? "standard");
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStep(fixedMode ? "prompt" : "mode");
      setSelectedMode(fixedMode ?? "standard");
      setPrompt("");
      reset();
      setCreating(false);
    }, 200);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !currentWorkspace) return;
    const result = await generate(prompt, selectedMode, i18n.language, currentWorkspace.id);
    if (result) {
      setStep("preview");
    }
  };

  const handleRegenerate = async () => {
    if (!prompt.trim() || !currentWorkspace) return;
    reset();
    const result = await generate(prompt, selectedMode, i18n.language, currentWorkspace.id);
    if (result) {
      setStep("preview");
    }
  };

  const handleCreateForm = async () => {
    if (!fields || !currentWorkspace || !user) return;

    // If in "fields only" mode (from FormBuilder), just pass fields back
    if (onFieldsGenerated) {
      onFieldsGenerated(fields, title ?? "", description ?? "");
      handleClose();
      return;
    }

    setCreating(true);
    try {
      const result = await createForm.mutateAsync({
        title: title || t("ai.untitledForm"),
        description: description || null,
        mode: selectedMode,
      });

      if (result) {
        // Update the form with AI-generated fields
        await supabase
          .from("forms")
          .update({ fields: fields as unknown as Record<string, unknown>[] })
          .eq("id", result.id);

        toast({
          title: t("ai.formCreated"),
          description: title || t("ai.untitledForm"),
        });
        handleClose();
        navigate(`/forms/${result.id}/edit`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("ai.generationError");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("ai.createWithAi")}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Mode Selection */}
        {step === "mode" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{t("ai.selectMode")}</p>
            <div className="grid grid-cols-2 gap-3">
              {MODE_OPTIONS.map(({ mode, icon: Icon, labelKey, descKey }) => (
                <button
                  key={mode}
                  type="button"
                  className={`flex flex-col items-start gap-1 rounded-lg border-2 p-3 ltr:text-left rtl:text-right transition-all cursor-pointer ${
                    selectedMode === mode
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => setSelectedMode(mode)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{t(labelKey)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{t(descKey)}</span>
                </button>
              ))}
            </div>
            <Button className="w-full" onClick={() => setStep("prompt")}>
              {t("common.continue")}
            </Button>
          </div>
        )}

        {/* Step 2: Prompt Input */}
        {step === "prompt" && (
          <div className="space-y-4 pt-2">
            {!fixedMode && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 -ms-2"
                onClick={() => setStep("mode")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("common.back")}
              </Button>
            )}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("ai.describeForm")}</p>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t("ai.promptPlaceholder")}
                rows={4}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("ai.promptExamples")}</p>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_EXAMPLE_KEYS[selectedMode].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setPrompt(t(key))}
                    disabled={isLoading}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { handleClose(); navigate("/templates"); }}>
                  <LayoutTemplate className="h-4 w-4" /> {t("ai.tryTemplateInstead")}
                </Button>
              </div>
            )}
            <Button
              className="w-full gap-2"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading || rateLimited}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("ai.generating")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("ai.generateFields")}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && fields && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <h3 className="font-semibold">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pe-1">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <span className="text-xs text-muted-foreground font-mono w-5 text-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{field.label}</span>
                      {field.required && (
                        <span className="text-destructive text-xs">*</span>
                      )}
                    </div>
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground truncate">{field.helpText}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {FIELD_TYPE_LABEL_KEYS[field.type] ? t(FIELD_TYPE_LABEL_KEYS[field.type]) : field.type}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleRegenerate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t("ai.regenerate")}
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleCreateForm}
                disabled={creating || isLoading}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {onFieldsGenerated ? t("ai.applyFields") : t("ai.createForm")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
