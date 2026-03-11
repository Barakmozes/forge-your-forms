// === AGENT 11: Template Preview Component ===
// Renders form fields in a read-only preview mode
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PreviewField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
}

interface TemplatePreviewProps {
  fields: PreviewField[];
  mode: string;
}

export default function TemplatePreview({ fields, mode }: TemplatePreviewProps) {
  const { t } = useTranslation();

  if (fields.length === 0) {
    const modeDescKeys: Record<string, string> = {
      waitlist: "templates.waitlistPreviewDesc",
      feedback: "templates.feedbackPreviewDesc",
      support: "templates.supportPreviewDesc",
    };

    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t(modeDescKeys[mode] || "templates.noCustomFields")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          {field.type === "section_header" ? (
            <h3 className="font-display font-semibold text-lg pt-2">{field.label}</h3>
          ) : field.type === "paragraph_text" ? (
            <p className="text-sm text-muted-foreground">{field.label}</p>
          ) : (
            <>
              <Label className="text-sm flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>

              {(field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "number" || field.type === "date") && (
                <Input
                  type={field.type === "phone" ? "tel" : field.type}
                  placeholder={field.placeholder || ""}
                  disabled
                  className="bg-muted/30"
                  dir={field.type === "email" || field.type === "phone" ? "ltr" : undefined}
                />
              )}

              {field.type === "textarea" && (
                <Textarea
                  placeholder={field.placeholder || ""}
                  disabled
                  rows={3}
                  className="bg-muted/30"
                />
              )}

              {field.type === "select" && field.options && (
                <Select disabled>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue placeholder={t("templates.selectPlaceholder", { label: field.label.toLowerCase() })} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === "radio" && field.options && (
                <RadioGroup disabled className="flex flex-col gap-2">
                  {field.options.map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} disabled />
                      <Label className="text-sm text-muted-foreground">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {(field.type === "checkbox" || field.type === "multi_select") && field.options && (
                <div className="flex flex-col gap-2">
                  {field.options.map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <Checkbox disabled />
                      <Label className="text-sm text-muted-foreground">{opt}</Label>
                    </div>
                  ))}
                </div>
              )}

              {field.type === "file_upload" && (
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">{t("templates.fileUploadField")}</p>
                </div>
              )}

              {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
