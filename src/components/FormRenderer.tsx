import { useState, useRef } from "react";
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

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "select"
  | "multi_select"
  | "checkbox"
  | "radio"
  | "file_upload"
  | "section_header"
  | "paragraph_text";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: string[];
  validation: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

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
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
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
              className="ml-1 rounded-full hover:bg-destructive/10 p-1"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">Click to upload</span> or drag & drop
            </p>
            <p className="text-xs text-muted-foreground">Any file up to 20 MB</p>
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
    const value = values[field.id];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (field.required && isEmpty) {
      errors[field.id] = "This field is required.";
      continue;
    }

    if (!isEmpty && field.type === "email" && typeof value === "string") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.id] = "Please enter a valid email address.";
      }
    }

    if (!isEmpty && field.type === "number" && typeof value === "string") {
      const num = parseFloat(value);
      if (field.validation.min !== undefined && num < field.validation.min)
        errors[field.id] = `Minimum value is ${field.validation.min}.`;
      if (field.validation.max !== undefined && num > field.validation.max)
        errors[field.id] = `Maximum value is ${field.validation.max}.`;
    }

    if (!isEmpty && ["text", "textarea"].includes(field.type) && typeof value === "string") {
      if (field.validation.minLength && value.length < field.validation.minLength)
        errors[field.id] = `Minimum ${field.validation.minLength} characters required.`;
      if (field.validation.maxLength && value.length > field.validation.maxLength)
        errors[field.id] = `Maximum ${field.validation.maxLength} characters allowed.`;
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
  onSubmitSuccess?: () => void;
}

export function FormRenderer({ fields, formId, isPreview = false, onSubmitSuccess }: FormRendererProps) {
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        .insert({ form_id: formId, data: resolvedData });

      if (error) throw error;

      setSubmitted(true);
      onSubmitSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setErrors({ _form: message });
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
        <h2 className="text-2xl font-semibold text-foreground">Response submitted!</h2>
        <p className="text-muted-foreground max-w-sm">
          Thank you — your response has been recorded successfully.
        </p>
      </div>
    );
  }

  const interactiveFields = fields.filter(
    (f) => !["section_header", "paragraph_text"].includes(f.type)
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {fields.map((field) => {
        const isDisplay = ["section_header", "paragraph_text"].includes(field.type);
        return (
          <div key={field.id} id={`field-${field.id}`} className="space-y-2">
            {!isDisplay && (
              <Label className="text-sm font-medium text-foreground">
                {field.label}
                {field.required && (
                  <span className="text-destructive ml-1" aria-hidden="true">*</span>
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
          className="w-full h-12 text-base font-semibold mt-4"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      )}

      {isPreview && interactiveFields.length > 0 && (
        <Button
          type="button"
          disabled
          className="w-full h-12 text-base font-semibold mt-4 opacity-60"
        >
          Submit (Preview)
        </Button>
      )}
    </form>
  );
}
