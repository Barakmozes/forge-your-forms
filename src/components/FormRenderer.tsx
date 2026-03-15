import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { UploadCloud, X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluateCondition } from "@/components/builder/ConditionalLogic";
import type { FormSettings } from "@/components/builder/FormSettingsPanel";
import type { FormBranding } from "@/components/builder/BrandingPanel";
import { dispatchWebhook, WEBHOOK_EVENTS } from "@/lib/webhookEvents"; /* === AGENT 9: Webhook import === */
import { dispatchSlackNotification } from "@/hooks/useIntegrations"; /* === AGENT 10: Slack import === */
import { dispatchWorkflowTrigger } from "@/lib/workflowEngine"; /* === AGENT 15: Workflow import === */
import { PrivacyNotice } from "@/components/gdpr/PrivacyNotice"; /* === AGENT 04: GDPR === */
// Import canonical FormField type from single source of truth
import type { FieldType, FormField } from "@/types/forms";
// Re-export for backward compatibility (FormPreview and others import from here)
export type { FieldType, FormField };

export type FormValues = Record<string, string | string[] | File | null>;

interface FieldProps {
  field: FormField;
  value: string | string[] | File | null | undefined;
  onChange: (value: string | string[] | File | null) => void;
  error?: string;
  isPreview?: boolean;
}

// ─── File Upload Field ───────────────────────────────────────────────────────

function FileUploadField({ field, value, onChange, error }: FieldProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const file = value instanceof File ? value : null;

  const handleFile = (f: File) => onChange(f);

  return (
    <div className="space-y-1">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) handleFile(dropped);
        }}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 sm:p-8 text-center cursor-pointer transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : error
            ? "border-destructive bg-destructive/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="ltr:ml-1 rtl:mr-1 rounded-full hover:bg-destructive/10 p-1"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">{i18n.t("forms.clickToUpload")}</span> {i18n.t("forms.orDragDrop")}
            </p>
            <p className="text-xs text-muted-foreground">{i18n.t("forms.anyFileUpTo")}</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}

// ─── Single Field ─────────────────────────────────────────────────────────────

function FormFieldComponent({ field, value, onChange, error, isPreview }: FieldProps) {
  const strVal = typeof value === "string" ? value : "";
  const arrVal = Array.isArray(value) ? value : [];

  const inputCls = cn(
    "h-12 text-base",
    error && "border-destructive focus-visible:ring-destructive"
  );

  switch (field.type) {
    case "section_header":
      return (
        <div className="pt-4 pb-2">
          <h2 className="text-xl font-semibold text-foreground">{field.label}</h2>
          {field.helpText && <p className="text-sm text-muted-foreground mt-1">{field.helpText}</p>}
          <Separator className="mt-3" />
        </div>
      );

    case "paragraph_text":
      return (
        <p className="text-sm text-muted-foreground leading-relaxed py-1">{field.label}</p>
      );

    case "textarea":
      return (
        <Textarea
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Your answer..."}
          className={cn("min-h-[120px] text-base resize-none", error && "border-destructive")}
          readOnly={isPreview}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "0"}
          min={field.validation.min}
          max={field.validation.max}
          className={inputCls}
          readOnly={isPreview}
        />
      );

    case "email":
      return (
        <Input
          type="email"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "you@example.com"}
          className={inputCls}
          readOnly={isPreview}
        />
      );

    case "phone":
      return (
        <Input
          type="tel"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "+1 (555) 000-0000"}
          className={inputCls}
          readOnly={isPreview}
        />
      );

    case "date":
      return (
        <Input
          type="date"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, "cursor-pointer")}
          readOnly={isPreview}
        />
      );

    case "select":
      return (
        <Select value={strVal} onValueChange={onChange} disabled={isPreview}>
          <SelectTrigger className={cn("h-12 text-base", error && "border-destructive")}>
            <SelectValue placeholder={field.placeholder || "Select an option..."} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-base py-3">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multi_select":
    case "checkbox":
      return (
        <div className="space-y-3">
          {field.options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                id={`${field.id}-${opt}`}
                checked={arrVal.includes(opt)}
                onCheckedChange={(checked) => {
                  if (isPreview) return;
                  onChange(
                    checked
                      ? [...arrVal, opt]
                      : arrVal.filter((v) => v !== opt)
                  );
                }}
                className="h-5 w-5"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {opt}
              </span>
            </label>
          ))}
        </div>
      );

    case "radio":
      return (
        <RadioGroup
          value={strVal}
          onValueChange={isPreview ? undefined : onChange}
          className="space-y-3"
        >
          {field.options.map((opt) => (
            <label
              key={opt}
              htmlFor={`${field.id}-${opt}`}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <RadioGroupItem
                id={`${field.id}-${opt}`}
                value={opt}
                className="h-5 w-5"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {opt}
              </span>
            </label>
          ))}
        </RadioGroup>
      );

    case "file_upload":
      return (
        <FileUploadField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          isPreview={isPreview}
        />
      );

    case "text":
    default:
      return (
        <Input
          type="text"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Your answer..."}
          className={inputCls}
          readOnly={isPreview}
        />
      );
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateFields(
  fields: FormField[],
  values: FormValues
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (["section_header", "paragraph_text"].includes(field.type)) continue;

    // Skip hidden fields (conditional logic)
    if (!evaluateCondition(field.condition, values)) continue;

    const value = values[field.id];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (field.required && isEmpty) {
      errors[field.id] = i18n.t("forms.validationRequired");
      continue;
    }

    if (!isEmpty && field.type === "email" && typeof value === "string") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.id] = i18n.t("forms.validationEmail");
      }
    }

    if (!isEmpty && field.type === "phone" && typeof value === "string") {
      // SECURITY: Do NOT use field.validation.phonePattern (user-supplied regex) — ReDoS risk.
      // Use a safe hardcoded pattern that covers international formats without catastrophic backtracking.
      const SAFE_PHONE_RE = /^[+]?[\d\s\-(). ]{7,20}$/;
      if (!SAFE_PHONE_RE.test(value)) {
        errors[field.id] = i18n.t("forms.validationPhone");
      }
    }

    if (!isEmpty && field.type === "number" && typeof value === "string") {
      const num = parseFloat(value);
      if (field.validation.min !== undefined && num < field.validation.min)
        errors[field.id] = i18n.t("forms.validationMinValue", { min: field.validation.min });
      if (field.validation.max !== undefined && num > field.validation.max)
        errors[field.id] = i18n.t("forms.validationMaxValue", { max: field.validation.max });
    }

    if (!isEmpty && ["text", "textarea"].includes(field.type) && typeof value === "string") {
      if (field.validation.minLength && value.length < field.validation.minLength)
        errors[field.id] = i18n.t("forms.validationMinLength", { min: field.validation.minLength });
      if (field.validation.maxLength && value.length > field.validation.maxLength)
        errors[field.id] = i18n.t("forms.validationMaxLength", { max: field.validation.maxLength });
    }

    if (!isEmpty && field.type === "file_upload" && value instanceof File) {
      if (field.validation.maxFileSize && value.size > field.validation.maxFileSize * 1024 * 1024) {
        errors[field.id] = i18n.t("forms.validationFileSize", { size: field.validation.maxFileSize });
      }
      if (field.validation.allowedFileTypes && field.validation.allowedFileTypes.length > 0) {
        const ext = value.name.split(".").pop()?.toLowerCase() ?? "";
        if (!field.validation.allowedFileTypes.includes(ext)) {
          errors[field.id] = i18n.t("forms.validationFileTypes", { types: field.validation.allowedFileTypes.join(", ") });
        }
      }
    }
  }

  return errors;
}

// ─── Upload file to Supabase Storage ─────────────────────────────────────────

export async function uploadFile(formId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${formId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("form-uploads")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("form-uploads").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Full Form Renderer ───────────────────────────────────────────────────────

interface FormRendererProps {
  fields: FormField[];
  formId: string;
  isPreview?: boolean;
  settings?: FormSettings;
  branding?: FormBranding;
  submissionCount?: number;
  onSubmitSuccess?: () => void;
}

export function FormRenderer({ fields, formId, isPreview = false, settings, branding, submissionCount, onSubmitSuccess }: FormRendererProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // === AGENT 26: closeAfterCount safety net ===
  const closeAfterCount = settings?.closeAfterCount;
  const isClosedByCount = !!(closeAfterCount && closeAfterCount > 0 && submissionCount !== undefined && submissionCount >= closeAfterCount);

  if (isClosedByCount && !isPreview) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">{t("forms.formClosed")}</h2>
        <p className="text-muted-foreground max-w-sm">
          {t("forms.formClosedDesc")}
        </p>
      </div>
    );
  }
  // === END AGENT 26 ===

  const handleChange = (fieldId: string, value: string | string[] | File | null) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => { const next = { ...prev }; delete next[fieldId]; return next; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) return;

    const validationErrors = validateFields(fields, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstId = Object.keys(validationErrors)[0];
      document.getElementById(`field-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);

    try {
      // Resolve file uploads first
      const resolvedData: Record<string, unknown> = {};
      for (const field of fields) {
        if (["section_header", "paragraph_text"].includes(field.type)) continue;
        const val = values[field.id];
        if (field.type === "file_upload" && val instanceof File) {
          resolvedData[field.id] = await uploadFile(formId, val);
        } else {
          resolvedData[field.id] = val ?? null;
        }
      }

      const { error } = await supabase
        .from("submissions")
        .insert([{ form_id: formId, data: resolvedData as import("@/integrations/supabase/types").Json }]);

      if (error) throw error;

      /* === AGENT 9: Webhook Trigger === */
      dispatchWebhook(WEBHOOK_EVENTS.SUBMISSION_CREATED, { form_id: formId, data: resolvedData }, { formId });
      /* === END AGENT 9 === */
      /* === AGENT 10: Slack Trigger === */
      dispatchSlackNotification(formId, WEBHOOK_EVENTS.SUBMISSION_CREATED, { form_id: formId, data: resolvedData });
      /* === END AGENT 10 === */
      /* === AGENT 15: Workflow Trigger === */
      dispatchWorkflowTrigger(formId, "form_submitted", { form_id: formId, data: resolvedData });
      /* === END AGENT 15 === */

      if (settings?.redirectUrl) {
        // SECURITY: Only allow http/https redirects — block javascript: and data: URLs
        const redirectUrl = settings.redirectUrl.trim();
        if (redirectUrl.startsWith("https://") || redirectUrl.startsWith("http://")) {
          window.location.href = redirectUrl;
        }
        return;
      }
      setSubmitted(true);
      onSubmitSuccess?.();
    } catch (err: unknown) {
      // Log the real error for debugging but never expose Supabase internals to users
      console.error("Form submission error:", err);
      const pgCode = (err as { code?: string })?.code;
      const userMessage =
        pgCode === "23505" ? i18n.t("forms.errorDuplicate", { defaultValue: "This information has already been submitted." }) :
        pgCode === "42501" ? i18n.t("forms.errorPermission", { defaultValue: "You do not have permission to submit this form." }) :
        pgCode === "23503" ? i18n.t("forms.errorInvalidForm", { defaultValue: "This form is no longer available." }) :
        i18n.t("forms.errorGeneric", { defaultValue: "Something went wrong. Please try again." });
      setErrors({ _form: userMessage });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">{t("forms.responseSubmitted")}</h2>
        <p className="text-muted-foreground max-w-sm">
          {settings?.thankYouMessage || t("forms.defaultThankYou")}
        </p>
      </div>
    );
  }

  const interactiveFields = fields.filter(
    (f) => !["section_header", "paragraph_text"].includes(f.type)
  );

  const brandingStyle: React.CSSProperties = branding
    ? {
        ...(branding.backgroundColor ? { backgroundColor: branding.backgroundColor } : {}),
        ...(branding.font ? { fontFamily: branding.font } : {}),
      }
    : {};

  const buttonStyle: React.CSSProperties = branding
    ? {
        ...(branding.primaryColor ? { backgroundColor: branding.primaryColor, borderColor: branding.primaryColor } : {}),
        ...(branding.borderRadius ? { borderRadius: branding.borderRadius } : {}),
      }
    : {};

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8" style={brandingStyle}>
      {fields.map((field) => {
        const isDisplay = ["section_header", "paragraph_text"].includes(field.type);

        // Evaluate conditional logic
        if (!evaluateCondition(field.condition, values)) return null;

        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            {!isDisplay && (
              <Label className="text-sm font-medium text-foreground">
                {field.label}
                {field.required && (
                  <span className="text-destructive ltr:ml-1 rtl:mr-1" aria-hidden="true">*</span>
                )}
              </Label>
            )}

            <FormFieldComponent
              field={field}
              value={values[field.id]}
              onChange={(val) => handleChange(field.id, val)}
              error={errors[field.id]}
              isPreview={isPreview}
            />

            {field.helpText && !isDisplay && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}

            {errors[field.id] && (
              <p className="text-sm text-destructive font-medium" role="alert">
                {errors[field.id]}
              </p>
            )}
          </div>
        );
      })}

      {errors._form && (
        <p className="text-sm text-destructive font-medium text-center" role="alert">
          {errors._form}
        </p>
      )}

      {!isPreview && interactiveFields.length > 0 && (
        <Button
          type="submit"
          disabled={submitting}
          className={cn("w-full h-12 text-base font-semibold mt-4", branding?.primaryColor && "hover:opacity-90")}
          style={buttonStyle}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("forms.submitting")}
            </>
          ) : (
            t("common.submit")
          )}
        </Button>
      )}

      {isPreview && interactiveFields.length > 0 && (
        <Button
          type="button"
          disabled
          className="w-full h-12 text-base font-semibold mt-4 opacity-60"
          style={buttonStyle}
        >
          {t("forms.submitPreview")}
        </Button>
      )}

      {/* GDPR Privacy Notice — shown only on live public forms, not in preview */}
      {/* === AGENT 04: Privacy notice for GDPR Articles 13-14 === */}
      {!isPreview && interactiveFields.length > 0 && (
        <PrivacyNotice
          dataCollected={["your submitted data"]}
          purpose="as described in this form"
        />
      )}
      {/* === END AGENT 04 === */}
    </form>
  );
}
