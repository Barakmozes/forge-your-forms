import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { generateReferralCode } from "@/lib/referralCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Copy, Check, Share2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { dispatchWebhook, WEBHOOK_EVENTS } from "@/lib/webhookEvents"; /* === AGENT 9: Webhook import === */
import { dispatchSlackNotification, syncToMailchimp } from "@/hooks/useIntegrations"; /* === AGENT 10: Slack + Mailchimp import === */
import { dispatchWorkflowTrigger } from "@/lib/workflowEngine"; /* === AGENT 15: Workflow import === */
import { PrivacyNotice } from "@/components/gdpr/PrivacyNotice"; /* === AGENT 04: GDPR === */

interface WaitlistLandingPageProps {
  formId: string;
  title: string;
  description: string | null;
  branding: Record<string, string> | null;
  settings: Record<string, unknown> | null;
  referralCode?: string;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  position: number;
  referral_code: string;
  referral_count: number;
}

type SubmitState = "idle" | "submitting" | "success" | "duplicate";

export default function WaitlistLandingPage({
  formId,
  title,
  description,
  branding,
  settings,
  referralCode,
}: WaitlistLandingPageProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  // totalSignups: set after a successful signup; anon count query is blocked by RLS (migration 025)
  const [totalSignups, setTotalSignups] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const requireName = settings?.requireName === true;
  const showPosition = settings?.showPosition !== false;
  const showCount = settings?.showCount !== false;
  const enableReferrals = settings?.enableReferrals !== false;
  const primaryColor = branding?.primaryColor ?? "";
  const backgroundColor = branding?.backgroundColor ?? "";
  const backgroundGradient = branding?.backgroundGradient ?? "";
  const logo = branding?.logoUrl ?? "";

  const referralLink = useMemo(() => {
    if (!entry) return "";
    return `${window.location.origin}/f/${formId}?ref=${entry.referral_code}`;
  }, [entry, formId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error(t('waitlist.enterEmail'));
      return;
    }

    if (requireName && !name.trim()) {
      toast.error(t('waitlist.enterName'));
      return;
    }

    setSubmitState("submitting");

    try {
      const newReferralCode = generateReferralCode();

      // Attempt INSERT directly. DB triggers handle position assignment and referral tracking.
      // Duplicate detection uses the unique constraint on (form_id, email): PostgreSQL error code 23505.
      // A pre-flight SELECT is avoided because anonymous users cannot SELECT from waitlist_entries
      // after migration 025 dropped the permissive anon SELECT policy (waitlist_entries_select_own).
      const { data: inserted, error: insertError } = await supabase
        .from("waitlist_entries")
        .insert({
          form_id: formId,
          email: trimmedEmail,
          name: name.trim() || null,
          referral_code: newReferralCode,
          referred_by: referralCode ?? null,
        })
        .select("id, email, name, position, referral_code, referral_count")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          // Duplicate email — unique constraint violation on (form_id, email).
          // Cannot retrieve existing entry data (anon SELECT blocked by RLS), show simplified message.
          setEntry(null);
          setSubmitState("duplicate");
          toast.info(t('waitlist.alreadyOnWaitlist'));
          return;
        }
        throw insertError;
      }

      setEntry(inserted);
      setSubmitState("success");
      // Use inserted.position as a proxy for total count when the anon count query is blocked by RLS.
      setTotalSignups((prev) => (prev !== null ? prev + 1 : inserted.position));
      toast.success(t('waitlist.youAreOnList'));

      /* === AGENT 9: Webhook Trigger === */
      dispatchWebhook(
        WEBHOOK_EVENTS.WAITLIST_SIGNUP,
        { form_id: formId, entry_id: inserted.id, email: inserted.email, position: inserted.position },
        { formId }
      );
      /* === END AGENT 9 === */
      /* === AGENT 10: Slack Trigger === */
      dispatchSlackNotification(formId, WEBHOOK_EVENTS.WAITLIST_SIGNUP, { email: inserted.email, name: inserted.name, position: inserted.position });
      syncToMailchimp(formId, inserted.email, inserted.name ? { FNAME: inserted.name } : undefined);
      /* === END AGENT 10 === */
      /* === AGENT 15: Workflow Trigger === */
      dispatchWorkflowTrigger(formId, "waitlist_milestone", { form_id: formId, entry_id: inserted.id, email: inserted.email, position: inserted.position });
      /* === END AGENT 15 === */
    } catch (err: unknown) {
      setSubmitState("idle");
      const message =
        err instanceof Error ? err.message : t('common.unexpectedError');
      toast.error(message);
    }
  }

  async function handleCopyLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success(t('waitlist.linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('waitlist.failedCopy'));
    }
  }

  function handleShareTwitter() {
    const text = encodeURIComponent(
      t('waitlist.twitterShareText', { title })
    );
    const url = encodeURIComponent(referralLink);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleShareWhatsApp() {
    const text = encodeURIComponent(
      t('waitlist.whatsAppShareText', { title, link: referralLink })
    );
    window.open(
      `https://wa.me/?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const isPostSubmit = submitState === "success" || submitState === "duplicate";

  // Inline styles derived from branding
  const pageBgStyle: React.CSSProperties = {};
  if (backgroundGradient) {
    pageBgStyle.background = backgroundGradient;
  } else if (backgroundColor) {
    pageBgStyle.backgroundColor = backgroundColor;
  }

  const ctaBtnStyle: React.CSSProperties = primaryColor
    ? { backgroundColor: primaryColor, borderColor: primaryColor }
    : {};

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:py-16",
        "bg-gradient-to-br from-background via-background to-muted/40",
        "dark:from-background dark:via-background dark:to-muted/20",
        "transition-colors duration-300"
      )}
      style={pageBgStyle}
    >
      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-8">
        {/* Logo */}
        {logo && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <img
              src={logo}
              alt={`${title} logo`}
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
        )}

        {/* Hero section */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            {title}
          </h1>

          {description && (
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              {description}
            </p>
          )}

          {/* Live signup counter — visible only after a successful signup on this page load */}
          {showCount && totalSignups !== null && totalSignups > 0 && (
            <div className="flex items-center justify-center gap-2 pt-2 animate-in fade-in duration-500 delay-300">
              <Badge
                variant="secondary"
                className="px-3 py-1.5 text-sm font-medium gap-1.5"
              >
                <Users className="h-3.5 w-3.5" />
                <span>
                  {totalSignups === 1
                    ? t('waitlist.personOnWaitlist', { count: totalSignups })
                    : t('waitlist.peopleOnWaitlist', { count: totalSignups })}
                </span>
              </Badge>
            </div>
          )}
        </div>

        {/* Signup form or success state */}
        <Card
          className={cn(
            "w-full border-border/50 shadow-lg",
            "animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200",
            "backdrop-blur-sm bg-card/95 dark:bg-card/90"
          )}
        >
          <CardContent className="p-6 sm:p-8">
            {!isPostSubmit ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {requireName && (
                  <div className="space-y-2">
                    <label
                      htmlFor="waitlist-name"
                      className="text-sm font-medium text-foreground"
                    >
                      {t('waitlist.name')}
                    </label>
                    <Input
                      id="waitlist-name"
                      type="text"
                      placeholder={t('waitlist.yourName')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={requireName}
                      disabled={submitState === "submitting"}
                      className="h-11"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="waitlist-email"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('waitlist.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="waitlist-email"
                      type="email"
                      dir="ltr"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={submitState === "submitting"}
                      className="h-11 ltr:pl-10 rtl:pr-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitState === "submitting"}
                  className={cn(
                    "w-full h-12 text-base font-semibold",
                    "transition-all duration-200",
                    primaryColor && "hover:opacity-90"
                  )}
                  style={ctaBtnStyle}
                >
                  {submitState === "submitting" ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {t('waitlist.joining')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t('waitlist.joinWaitlist')}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                {referralCode && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    {t('waitlist.referredHint')}
                  </p>
                )}
              </form>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                {/* Confirmation header */}
                <div className="text-center space-y-3">
                  <div
                    className={cn(
                      "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
                      "bg-green-100 dark:bg-green-900/30"
                    )}
                  >
                    <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-foreground">
                      {submitState === "duplicate"
                        ? t('waitlist.alreadyOnList')
                        : t('waitlist.youAreIn')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {submitState === "duplicate"
                        ? t('waitlist.existingSignupDetails')
                        : t('waitlist.thanksForJoining')}
                    </p>
                  </div>
                </div>

                {/* Position display */}
                {showPosition && entry && (
                  <div
                    className={cn(
                      "flex items-center justify-center gap-4 py-4 px-4",
                      "rounded-lg bg-muted/50 dark:bg-muted/30"
                    )}
                  >
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        {t('waitlist.yourPosition')}
                      </p>
                      <p className="text-3xl font-bold text-foreground tabular-nums mt-0.5">
                        #{entry.position.toLocaleString()}
                      </p>
                    </div>
                    {enableReferrals && entry.referral_count > 0 && (
                      <>
                        <div className="h-10 w-px bg-border" />
                        <div className="text-center">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            {t('waitlist.referrals')}
                          </p>
                          <p className="text-3xl font-bold text-foreground tabular-nums mt-0.5">
                            {entry.referral_count}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Referral section */}
                {enableReferrals && entry && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        {t('waitlist.shareToMoveUp')}
                      </p>
                    </div>
                    {/* Referral link copy */}
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={referralLink}
                        className="h-10 text-sm bg-muted/50 dark:bg-muted/30 select-all"
                        onFocus={(e) => e.target.select()}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCopyLink}
                        className="h-10 w-10 shrink-0"
                        aria-label="Copy referral link"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Share buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleShareTwitter}
                        className="h-10 text-sm gap-2"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 fill-current"
                          aria-hidden="true"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        {t('waitlist.shareOnX')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleShareWhatsApp}
                        className="h-10 text-sm gap-2"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 fill-current"
                          aria-hidden="true"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        {t('waitlist.whatsApp')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GDPR Privacy Notice */}
        {/* === AGENT 04: Privacy notice for GDPR Articles 13-14 === */}
        <PrivacyNotice
          dataCollected={["email", "name"]}
          purpose="to manage your waitlist position and send you updates"
          className="max-w-sm w-full text-center"
        />
        {/* === END AGENT 04 === */}

        {/* Footer branding */}
        {branding?.showPoweredBy !== "false" && branding?.showPoweredBy !== false && (
          <p className="text-xs text-muted-foreground/60 animate-in fade-in duration-700 delay-500">
            {t('common.poweredBy')}
          </p>
        )}
      </div>
    </div>
  );
}
