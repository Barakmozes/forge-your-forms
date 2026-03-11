import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, Check, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";
import { dispatchWebhook, WEBHOOK_EVENTS } from "@/lib/webhookEvents"; /* === AGENT 9: Webhook import === */
import { dispatchSlackNotification } from "@/hooks/useIntegrations"; /* === AGENT 10: Slack import === */

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedbackField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: string[];
  validation: Record<string, unknown>;
}

interface FeedbackSurveyPageProps {
  formId: string;
  title: string;
  description: string | null;
  branding: Record<string, string> | null;
  settings: Record<string, unknown> | null;
  fields: FeedbackField[];
}

type SubmitState = "idle" | "submitting" | "success";

// ─── NPS Helpers ─────────────────────────────────────────────────────────────

function getNpsCategory(score: number): "detractor" | "passive" | "promoter" {
  if (score <= 6) return "detractor";
  if (score <= 8) return "passive";
  return "promoter";
}

function getNpsButtonClasses(score: number, isSelected: boolean): string {
  const category = getNpsCategory(score);

  const baseColors: Record<string, string> = {
    detractor: cn(
      "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300",
      "dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60 dark:hover:border-red-700"
    ),
    passive: cn(
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300",
      "dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/60 dark:hover:border-amber-700"
    ),
    promoter: cn(
      "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300",
      "dark:border-green-800 dark:bg-green-950/40 dark:text-green-400 dark:hover:bg-green-950/60 dark:hover:border-green-700"
    ),
  };

  const selectedColors: Record<string, string> = {
    detractor: cn(
      "border-red-500 bg-red-500 text-white ring-2 ring-red-300 ring-offset-2",
      "dark:border-red-500 dark:bg-red-600 dark:ring-red-700 dark:ring-offset-background"
    ),
    passive: cn(
      "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-2",
      "dark:border-amber-500 dark:bg-amber-600 dark:ring-amber-700 dark:ring-offset-background"
    ),
    promoter: cn(
      "border-green-500 bg-green-500 text-white ring-2 ring-green-300 ring-offset-2",
      "dark:border-green-500 dark:bg-green-600 dark:ring-green-700 dark:ring-offset-background"
    ),
  };

  if (isSelected) return selectedColors[category];
  return baseColors[category];
}

function getNpsCategoryBadgeVariant(
  score: number
): "destructive" | "secondary" | "default" {
  const category = getNpsCategory(score);
  if (category === "detractor") return "destructive";
  if (category === "passive") return "secondary";
  return "default";
}

// ─── Custom Field Renderer ───────────────────────────────────────────────────

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: FeedbackField;
  value: string;
  onChange: (value: string) => void;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Your answer..."}
          className="min-h-[100px] text-base resize-none"
        />
      );

    case "select":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-11 text-base">
            <SelectValue
              placeholder={field.placeholder || "Select an option..."}
            />
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

    case "email":
      return (
        <Input
          type="email"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "you@example.com"}
          className="h-11 text-base"
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "0"}
          className="h-11 text-base"
        />
      );

    case "text":
    default:
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Your answer..."}
          className="h-11 text-base"
        />
      );
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FeedbackSurveyPage({
  formId,
  title,
  description,
  branding,
  settings,
  fields,
}: FeedbackSurveyPageProps) {
  const { t } = useTranslation();
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [category, setCategory] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>(
    {}
  );
  const [respondentEmail, setRespondentEmail] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  // Extract settings
  const categories = Array.isArray(settings?.categories)
    ? (settings.categories as string[])
    : [];
  const hasCategories = categories.length > 0;

  // Extract branding
  const primaryColor = branding?.primaryColor ?? "";
  const logo = branding?.logo ?? "";

  const accentStyle: React.CSSProperties = primaryColor
    ? { backgroundColor: primaryColor }
    : {};

  const ctaBtnStyle: React.CSSProperties = primaryColor
    ? { backgroundColor: primaryColor, borderColor: primaryColor }
    : {};

  const handleCustomFieldChange = useCallback(
    (fieldId: string, value: string) => {
      setCustomAnswers((prev) => ({ ...prev, [fieldId]: value }));
    },
    []
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (npsScore === null) {
      toast.error(t('feedback.pleaseSelectScore'));
      document
        .getElementById("nps-section")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Validate required custom fields
    for (const field of fields) {
      if (field.required && !customAnswers[field.id]?.trim()) {
        toast.error(t('feedback.pleaseFillIn', { field: field.label }));
        document
          .getElementById(`custom-field-${field.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    setSubmitState("submitting");

    try {
      const payload: {
        form_id: string;
        nps_score: number;
        respondent_email: string | null;
        respondent_name: string | null;
        follow_up: string | null;
        category: string | null;
        custom_answers: Json | null;
      } = {
        form_id: formId,
        nps_score: npsScore,
        respondent_email: respondentEmail.trim() || null,
        respondent_name: respondentName.trim() || null,
        follow_up: followUp.trim() || null,
        category: category || null,
        custom_answers:
          Object.keys(customAnswers).length > 0
            ? (customAnswers as unknown as Json)
            : null,
      };

      const { error } = await supabase
        .from("feedback_responses")
        .insert(payload);

      if (error) throw error;

      /* === AGENT 9: Webhook Trigger === */
      const sentiment = npsScore >= 9 ? "promoter" : npsScore >= 7 ? "passive" : "detractor";
      dispatchWebhook(
        sentiment === "detractor" ? WEBHOOK_EVENTS.FEEDBACK_RESPONSE : WEBHOOK_EVENTS.FEEDBACK_RESPONSE,
        { form_id: formId, nps_score: npsScore, sentiment },
        { formId }
      );
      /* === END AGENT 9 === */
      /* === AGENT 10: Slack Trigger === */
      dispatchSlackNotification(formId, WEBHOOK_EVENTS.FEEDBACK_RESPONSE, { nps_score: npsScore, sentiment });
      /* === END AGENT 10 === */

      setSubmitState("success");
      toast.success(t('feedback.thankYou'));
    } catch (err: unknown) {
      setSubmitState("idle");
      const message =
        err instanceof Error
          ? err.message
          : t('common.unexpectedError');
      toast.error(message);
    }
  }

  // ─── Thank You Screen ───────────────────────────────────────────────────────

  if (submitState === "success" && npsScore !== null) {
    const category = getNpsCategory(npsScore);
    const categoryLabel = category === "detractor" ? t('feedback.detractor') : category === "passive" ? t('feedback.passive') : t('feedback.promoter');
    const badgeVariant = getNpsCategoryBadgeVariant(npsScore);

    return (
      <div
        className={cn(
          "min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:py-16",
          "bg-gradient-to-br from-background via-background to-muted/40",
          "dark:from-background dark:via-background dark:to-muted/20",
          "transition-colors duration-300"
        )}
      >
        <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Success Icon */}
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full",
              "bg-green-100 dark:bg-green-900/30"
            )}
          >
            <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>

          {/* Success Message */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t('feedback.thankYou')}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              {t('feedback.responseRecorded')}
            </p>
          </div>

          {/* Score Display */}
          <Card className="w-full max-w-xs border-border/50 shadow-lg backdrop-blur-sm bg-card/95 dark:bg-card/90">
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {t('feedback.yourScore')}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl font-bold text-foreground tabular-nums">
                  {npsScore}
                </span>
                <span className="text-2xl text-muted-foreground">/10</span>
              </div>
              <Badge variant={badgeVariant} className="text-sm px-3 py-1">
                {categoryLabel}
              </Badge>
            </CardContent>
          </Card>

          {/* Footer branding */}
          <p className="text-xs text-muted-foreground/60">
            {t('common.poweredBy')}
          </p>
        </div>
      </div>
    );
  }

  // ─── Survey Form ─────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center px-4 py-8 sm:py-12",
        "bg-gradient-to-br from-background via-background to-muted/40",
        "dark:from-background dark:via-background dark:to-muted/20",
        "transition-colors duration-300"
      )}
    >
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Top Accent Bar */}
        <div
          className={cn(
            "h-2 w-full rounded-full",
            !primaryColor && "bg-primary"
          )}
          style={accentStyle}
        />

        {/* Header */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {logo && (
            <div className="flex justify-center">
              <img
                src={logo}
                alt={`${title} logo`}
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Survey Card */}
        <Card
          className={cn(
            "w-full border-border/50 shadow-lg",
            "animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200",
            "backdrop-blur-sm bg-card/95 dark:bg-card/90"
          )}
        >
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ── NPS Scale ──────────────────────────────────────────── */}
              <div id="nps-section" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <Label className="text-base sm:text-lg font-semibold text-foreground">
                    {t('feedback.howLikelyRecommend')}
                  </Label>
                </div>

                <div className="space-y-2">
                  {/* Score buttons */}
                  <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
                    {Array.from({ length: 11 }, (_, i) => i).map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setNpsScore(score)}
                        className={cn(
                          "relative flex items-center justify-center",
                          "h-10 sm:h-12 rounded-lg border-2 text-sm sm:text-base font-bold",
                          "transition-all duration-200 ease-out",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          getNpsButtonClasses(score, npsScore === score)
                        )}
                        aria-label={`Score ${score}`}
                        aria-pressed={npsScore === score}
                      >
                        {score}
                      </button>
                    ))}
                  </div>

                  {/* Scale labels */}
                  <div className="flex justify-between px-1">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {t('feedback.notLikely')}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {t('feedback.veryLikely')}
                    </span>
                  </div>
                </div>

                {/* Selected score indicator */}
                {npsScore !== null && (
                  <div className="flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Badge
                      variant={getNpsCategoryBadgeVariant(npsScore)}
                      className="text-xs px-2.5 py-0.5"
                    >
                      {getNpsCategory(npsScore) === "detractor" ? t('feedback.detractor') : getNpsCategory(npsScore) === "passive" ? t('feedback.passive') : t('feedback.promoter')} ({npsScore}/10)
                    </Badge>
                  </div>
                )}
              </div>

              {/* ── Follow-up Textarea ─────────────────────────────────── */}
              {npsScore !== null && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label
                      htmlFor="follow-up"
                      className="text-sm font-medium text-foreground"
                    >
                      {t('feedback.mainReason')}
                    </Label>
                  </div>
                  <Textarea
                    id="follow-up"
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    placeholder={t('feedback.tellUsMore')}
                    className="min-h-[120px] text-base resize-none"
                  />
                </div>
              )}

              {/* ── Category Selector ──────────────────────────────────── */}
              {npsScore !== null && hasCategories && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                  <Label
                    htmlFor="category"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('feedback.category')}
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder={t('feedback.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat}
                          value={cat}
                          className="text-base py-3"
                        >
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ── Custom Fields ──────────────────────────────────────── */}
              {npsScore !== null && fields.length > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      id={`custom-field-${field.id}`}
                      className="space-y-2"
                    >
                      <Label className="text-sm font-medium text-foreground">
                        {field.label}
                        {field.required && (
                          <span
                            className="text-destructive ltr:ml-1 rtl:mr-1"
                            aria-hidden="true"
                          >
                            *
                          </span>
                        )}
                      </Label>

                      <CustomFieldInput
                        field={field}
                        value={customAnswers[field.id] ?? ""}
                        onChange={(value) =>
                          handleCustomFieldChange(field.id, value)
                        }
                      />

                      {field.helpText && (
                        <p className="text-xs text-muted-foreground">
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Optional Contact Info ──────────────────────────────── */}
              {npsScore !== null && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">
                        {t('feedback.optional')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="respondent-name"
                        className="text-sm text-muted-foreground"
                      >
                        {t('feedback.name')}
                      </Label>
                      <Input
                        id="respondent-name"
                        type="text"
                        value={respondentName}
                        onChange={(e) => setRespondentName(e.target.value)}
                        placeholder={t('feedback.yourName')}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="respondent-email"
                        className="text-sm text-muted-foreground"
                      >
                        {t('feedback.email')}
                      </Label>
                      <Input
                        id="respondent-email"
                        type="email"
                        dir="ltr"
                        value={respondentEmail}
                        onChange={(e) => setRespondentEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Submit Button ──────────────────────────────────────── */}
              <Button
                type="submit"
                size="lg"
                disabled={submitState === "submitting" || npsScore === null}
                className={cn(
                  "w-full h-12 text-base font-semibold",
                  "transition-all duration-200",
                  primaryColor && "hover:opacity-90",
                  npsScore === null && "opacity-50 cursor-not-allowed"
                )}
                style={npsScore !== null ? ctaBtnStyle : {}}
              >
                {submitState === "submitting" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('feedback.submitting')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {t('feedback.submitFeedback')}
                    <Send className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer branding */}
        <p className="text-center text-xs text-muted-foreground/60 animate-in fade-in duration-700 delay-500">
          {t('common.poweredBy')}
        </p>
      </div>
    </div>
  );
}
