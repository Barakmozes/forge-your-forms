import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check,
  X,
  Hammer,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
// === AGENT 6: Stripe checkout integration ===
import CheckoutButton from "@/components/billing/CheckoutButton";
import { useSubscription } from "@/hooks/useSubscription";
import type { PlanTier } from "@/lib/stripe";
// === END AGENT 6 ===

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Tier {
  planId: PlanTier;
  name: string;
  monthlyPrice: number;
  description: string;
  cta: string;
  ctaVariant: "default" | "outline";
  highlighted: boolean;
  features: string[];
}

interface ComparisonFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  growth: boolean | string;
  business: boolean | string;
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm font-medium">{value}</span>;
  }
  return value ? (
    <Check className="h-4 w-4 text-primary mx-auto" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Pricing() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);
  // === AGENT 6: subscription detection for current plan ===
  const { plan: currentPlan } = useSubscription();
  // === END AGENT 6 ===

  const tiers: Tier[] = [
    {
      planId: "free",
      name: t('pricing.tierFree'),
      monthlyPrice: 0,
      description: t('pricing.tierFreeDesc'),
      cta: t('pricing.ctaGetStarted'),
      ctaVariant: "outline",
      highlighted: false,
      features: [
        t('pricing.feat3Forms'),
        t('pricing.feat100Submissions'),
        t('pricing.featStandardOnly'),
        t('pricing.feat1Member'),
        t('pricing.featCommunitySupport'),
      ],
    },
    {
      planId: "pro",
      name: t('pricing.tierPro'),
      monthlyPrice: 29,
      description: t('pricing.tierProDesc'),
      cta: t('pricing.ctaStartTrial'),
      ctaVariant: "default",
      highlighted: false,
      features: [
        t('pricing.featUnlimitedForms'),
        t('pricing.feat5kSubmissions'),
        t('pricing.featAll4Modes'),
        t('pricing.feat5Members'),
        t('pricing.featCustomBranding'),
        t('pricing.featCSVExport'),
        t('pricing.featEmailSupport'),
      ],
    },
    {
      planId: "growth",
      name: t('pricing.tierGrowth'),
      monthlyPrice: 59,
      description: t('pricing.tierGrowthDesc'),
      cta: t('pricing.ctaStartTrial'),
      ctaVariant: "default",
      highlighted: true,
      features: [
        t('pricing.featUnlimitedForms'),
        t('pricing.feat25kSubmissions'),
        t('pricing.featAll4Modes'),
        t('pricing.feat15Members'),
        t('pricing.featCustomBrandingDomain'),
        t('pricing.featCSVAPIExport'),
        t('pricing.featPrioritySupport'),
        t('pricing.featAdvancedAnalytics'),
        t('pricing.featSLATracking'),
      ],
    },
    {
      planId: "business",
      name: t('pricing.tierBusiness'),
      monthlyPrice: 99,
      description: t('pricing.tierBusinessDesc'),
      cta: t('pricing.ctaContactSales'),
      ctaVariant: "outline",
      highlighted: false,
      features: [
        t('pricing.featUnlimitedForms'),
        t('pricing.featUnlimitedSubmissions'),
        t('pricing.featAll4Modes'),
        t('pricing.featUnlimitedMembers'),
        t('pricing.featWhiteLabel'),
        t('pricing.featCSVAPIWebhookExport'),
        t('pricing.featDedicatedSupport'),
        t('pricing.featAdvancedAnalytics'),
        t('pricing.featSLATracking'),
        t('pricing.featSSOAudit'),
      ],
    },
  ];

  const comparisonFeatures: ComparisonFeature[] = [
    { name: t('pricing.compForms'), free: "3", pro: t('pricing.unlimited'), growth: t('pricing.unlimited'), business: t('pricing.unlimited') },
    { name: t('pricing.compSubmissions'), free: "100", pro: "5,000", growth: "25,000", business: t('pricing.unlimited') },
    { name: t('pricing.compStandardMode'), free: true, pro: true, growth: true, business: true },
    { name: t('pricing.compWaitlistMode'), free: false, pro: true, growth: true, business: true },
    { name: t('pricing.compFeedbackMode'), free: false, pro: true, growth: true, business: true },
    { name: t('pricing.compSupportMode'), free: false, pro: true, growth: true, business: true },
    { name: t('pricing.compMembers'), free: "1", pro: "5", growth: "15", business: t('pricing.unlimited') },
    { name: t('pricing.compBranding'), free: false, pro: true, growth: true, business: true },
    { name: t('pricing.compDomain'), free: false, pro: false, growth: true, business: true },
    { name: t('pricing.compCSV'), free: false, pro: true, growth: true, business: true },
    { name: t('pricing.compAPI'), free: false, pro: false, growth: true, business: true },
    { name: t('pricing.compWebhook'), free: false, pro: false, growth: false, business: true },
    { name: t('pricing.compAnalytics'), free: false, pro: false, growth: true, business: true },
    { name: t('pricing.compSLA'), free: false, pro: false, growth: true, business: true },
    { name: t('pricing.compCanned'), free: false, pro: true, growth: true, business: true },
    { name: t('pricing.compReferral'), free: false, pro: true, growth: true, business: true },
    { name: t('pricing.compRealtime'), free: true, pro: true, growth: true, business: true },
    { name: t('pricing.compSSO'), free: false, pro: false, growth: false, business: true },
    { name: t('pricing.compDedicated'), free: false, pro: false, growth: false, business: true },
  ];

  const faqs = [
    {
      question: t('pricing.faqChangePlans'),
      answer: t('pricing.faqChangePlansAnswer'),
    },
    {
      question: t('pricing.faqSubmissionLimit'),
      answer: t('pricing.faqSubmissionLimitAnswer'),
    },
    {
      question: t('pricing.faqFreeTrial'),
      answer: t('pricing.faqFreeTrialAnswer'),
    },
    {
      question: t('pricing.faqCancel'),
      answer: t('pricing.faqCancelAnswer'),
    },
  ];

  const price = (monthly: number) => {
    if (monthly === 0) return 0;
    return annual ? Math.round(monthly * 0.8) : monthly;
  };

  const CtaArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-colored">
              <Hammer className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>FormForge</span>
          </Link>
          <nav className="ltr:ml-auto rtl:mr-auto flex items-center gap-2">
            <Link to="/pricing">
              <Button variant="ghost" size="sm">{t('landing.pricing')}</Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm">{t('landing.signIn')}</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-colored">
                {t('landing.getStartedFree')}
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Header */}
      <section className="py-16 sm:py-20 text-center">
        <div className="container">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {t('pricing.simpleTransparentPricing')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            {t('pricing.startFreeUpgrade')}
          </p>

          {/* Annual toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={cn("text-sm font-medium", !annual && "text-foreground", annual && "text-muted-foreground")}>
              {t('pricing.monthly')}
            </span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={cn("text-sm font-medium", annual && "text-foreground", !annual && "text-muted-foreground")}>
              {t('pricing.annual')}
            </span>
            {annual && (
              <Badge variant="secondary" className="ltr:ml-1 rtl:mr-1 text-xs">{t('pricing.save20')}</Badge>
            )}
          </div>
        </div>
      </section>

      {/* Tier Cards */}
      <section className="pb-20">
        <div className="container">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={cn(
                  "relative flex flex-col transition-all",
                  tier.highlighted
                    ? "border-primary shadow-colored scale-[1.02] lg:scale-105"
                    : "border-border/50"
                )}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-primary-foreground px-3">{t('pricing.mostPopular')}</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <h3 className="font-display text-xl font-semibold">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  {/* Price */}
                  <div className="mb-6">
                    <span className="font-display text-4xl font-bold">
                      ${price(tier.monthlyPrice)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {tier.monthlyPrice === 0 ? ` ${t('pricing.forever')}` : t('pricing.perMonth')}
                    </span>
                    {annual && tier.monthlyPrice > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        ${price(tier.monthlyPrice) * 12}{t('pricing.perYear')}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="mb-8 flex-1 space-y-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA — AGENT 6: wired to Stripe Checkout */}
                  <div className="mt-auto">
                    {currentPlan === tier.planId ? (
                      <Badge variant="secondary" className="w-full py-2 justify-center text-sm">
                        {t("billing.currentPlanBadge")}
                      </Badge>
                    ) : tier.planId === "free" ? (
                      <Link to="/auth">
                        <Button
                          className={cn("w-full gap-2")}
                          variant={tier.ctaVariant}
                        >
                          {tier.cta} <CtaArrow className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : user ? (
                      <CheckoutButton
                        plan={tier.planId}
                        interval={annual ? "annual" : "monthly"}
                        className={cn(
                          "w-full gap-2",
                          tier.highlighted && "gradient-primary text-primary-foreground shadow-colored"
                        )}
                        variant={tier.highlighted ? "default" : tier.ctaVariant}
                      >
                        {tier.cta} <CtaArrow className="h-4 w-4" />
                      </CheckoutButton>
                    ) : (
                      <Link to="/auth">
                        <Button
                          className={cn(
                            "w-full gap-2",
                            tier.highlighted && "gradient-primary text-primary-foreground shadow-colored"
                          )}
                          variant={tier.highlighted ? "default" : tier.ctaVariant}
                        >
                          {tier.cta} <CtaArrow className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <h2 className="text-center font-display text-3xl font-bold mb-10">
            {t('pricing.comparePlans')}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 bg-card border-b border-border">
                  <th className="ltr:text-left rtl:text-right p-4 font-semibold min-w-[200px]">{t('pricing.feature')}</th>
                  <th className="p-4 font-semibold text-center min-w-[100px]">{t('pricing.tierFree')}</th>
                  <th className="p-4 font-semibold text-center min-w-[100px]">{t('pricing.tierPro')}</th>
                  <th className="p-4 font-semibold text-center min-w-[100px]">
                    <span className="text-primary">{t('pricing.tierGrowth')}</span>
                  </th>
                  <th className="p-4 font-semibold text-center min-w-[100px]">{t('pricing.tierBusiness')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((f, i) => (
                  <tr key={f.name} className={cn("border-b border-border/50", i % 2 === 0 && "bg-muted/20")}>
                    <td className="p-4 font-medium">{f.name}</td>
                    <td className="p-4 text-center"><CellValue value={f.free} /></td>
                    <td className="p-4 text-center"><CellValue value={f.pro} /></td>
                    <td className="p-4 text-center"><CellValue value={f.growth} /></td>
                    <td className="p-4 text-center"><CellValue value={f.business} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold mb-10">
            {t('pricing.faq')}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="ltr:text-left rtl:text-right font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 py-10">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2 font-display font-bold text-lg">
              <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
                <Hammer className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span>FormForge</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">{t('pricing.home')}</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">{t('landing.pricing')}</Link>
              <Link to="/auth" className="hover:text-foreground transition-colors">{t('landing.signIn')}</Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} FormForge. {t('landing.allRightsReserved')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
