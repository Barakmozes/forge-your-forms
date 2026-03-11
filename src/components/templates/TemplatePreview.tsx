// === AGENT 11: Template Preview Component ===
// Renders form fields in a read-only preview mode
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  if (fields.length === 0) {
    const modeLabels: Record<string, string> = {
      waitlist: "This waitlist template uses the built-in waitlist signup page with email collection and optional referral tracking.",
      feedback: "This feedback template uses the built-in NPS survey page with score selection, categories, and follow-up questions.",
      support: "This support template uses the built-in ticket submission page with subject, description, category, and priority fields.",
    };

    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {modeLabels[mode] || "This template has no custom fields."}
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
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
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
                  <p className="text-xs text-muted-foreground">File upload field</p>
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
