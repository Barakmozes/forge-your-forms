import { useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Tier {
  name: string;
  monthlyPrice: number;
  description: string;
  cta: string;
  ctaVariant: "default" | "outline";
  highlighted: boolean;
  features: string[];
}

const tiers: Tier[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    description: "For individuals getting started.",
    cta: "Get Started",
    ctaVariant: "outline",
    highlighted: false,
    features: [
      "3 forms",
      "100 submissions/mo",
      "Standard mode only",
      "1 workspace member",
      "Community support",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    description: "For small teams shipping faster.",
    cta: "Start Free Trial",
    ctaVariant: "default",
    highlighted: false,
    features: [
      "Unlimited forms",
      "5,000 submissions/mo",
      "All 4 modes",
      "5 workspace members",
      "Custom branding",
      "CSV export",
      "Email support",
    ],
  },
  {
    name: "Growth",
    monthlyPrice: 59,
    description: "For growing teams that need more.",
    cta: "Start Free Trial",
    ctaVariant: "default",
    highlighted: true,
    features: [
      "Unlimited forms",
      "25,000 submissions/mo",
      "All 4 modes",
      "15 workspace members",
      "Custom branding & domain",
      "CSV + API export",
      "Priority support",
      "Advanced analytics",
      "SLA tracking",
    ],
  },
  {
    name: "Business",
    monthlyPrice: 99,
    description: "For teams that need everything.",
    cta: "Contact Sales",
    ctaVariant: "outline",
    highlighted: false,
    features: [
      "Unlimited forms",
      "Unlimited submissions",
      "All 4 modes",
      "Unlimited members",
      "White-label branding",
      "CSV + API + Webhook export",
      "Dedicated support",
      "Advanced analytics",
      "SLA tracking",
      "SSO & audit log",
    ],
  },
];

interface ComparisonFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  growth: boolean | string;
  business: boolean | string;
}

const comparisonFeatures: ComparisonFeature[] = [
  { name: "Forms", free: "3", pro: "Unlimited", growth: "Unlimited", business: "Unlimited" },
  { name: "Submissions / month", free: "100", pro: "5,000", growth: "25,000", business: "Unlimited" },
  { name: "Standard mode", free: true, pro: true, growth: true, business: true },
  { name: "Waitlist mode", free: false, pro: true, growth: true, business: true },
  { name: "Feedback / NPS mode", free: false, pro: true, growth: true, business: true },
  { name: "Support ticket mode", free: false, pro: true, growth: true, business: true },
  { name: "Workspace members", free: "1", pro: "5", growth: "15", business: "Unlimited" },
  { name: "Custom branding", free: false, pro: true, growth: true, business: true },
  { name: "Custom domain", free: false, pro: false, growth: true, business: true },
  { name: "CSV export", free: false, pro: true, growth: true, business: true },
  { name: "API export", free: false, pro: false, growth: true, business: true },
  { name: "Webhook export", free: false, pro: false, growth: false, business: true },
  { name: "Advanced analytics", free: false, pro: false, growth: true, business: true },
  { name: "SLA tracking", free: false, pro: false, growth: true, business: true },
  { name: "Canned responses", free: false, pro: true, growth: true, business: true },
  { name: "Referral system", free: false, pro: true, growth: true, business: true },
  { name: "Real-time updates", free: true, pro: true, growth: true, business: true },
  { name: "SSO & audit log", free: false, pro: false, growth: false, business: true },
  { name: "Dedicated support", free: false, pro: false, growth: false, business: true },
];

const faqs = [
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade anytime. When upgrading, you'll be charged the prorated difference. When downgrading, the new rate applies at the next billing cycle.",
  },
  {
    question: "What happens if I hit my submission limit?",
    answer: "You'll receive a notification at 80% and 100% usage. Once you hit the limit, new submissions are queued until the next billing cycle — no data is lost. You can upgrade anytime to unlock more.",
  },
  {
    question: "Is there a free trial?",
    answer: "Yes! Pro and Growth plans include a 14-day free trial with full access. No credit card required to start.",
  },
  {
    question: "How do I cancel?",
    answer: "You can cancel anytime from your workspace settings. Your data is retained for 30 days after cancellation, and you can export everything before then.",
  },
];

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
  const [annual, setAnnual] = useState(false);

  const price = (monthly: number) => {
    if (monthly === 0) return 0;
    return annual ? Math.round(monthly * 0.8) : monthly;
  };

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
          <nav className="ml-auto flex items-center gap-2">
            <Link to="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-colored">
                Get Started Free
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Header */}
      <section className="py-16 sm:py-20 text-center">
        <div className="container">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Start free. Upgrade when you're ready. All plans include a 14-day trial.
          </p>

          {/* Annual toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={cn("text-sm font-medium", !annual && "text-foreground", annual && "text-muted-foreground")}>
              Monthly
            </span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={cn("text-sm font-medium", annual && "text-foreground", !annual && "text-muted-foreground")}>
              Annual
            </span>
            {annual && (
              <Badge variant="secondary" className="ml-1 text-xs">Save 20%</Badge>
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
                    <Badge className="gradient-primary text-primary-foreground px-3">Most Popular</Badge>
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
                      {tier.monthlyPrice === 0 ? " forever" : "/mo"}
                    </span>
                    {annual && tier.monthlyPrice > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        ${price(tier.monthlyPrice) * 12}/year (billed annually)
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

                  {/* CTA */}
                  <Link to="/auth" className="mt-auto">
                    <Button
                      className={cn(
                        "w-full gap-2",
                        tier.highlighted && "gradient-primary text-primary-foreground shadow-colored"
                      )}
                      variant={tier.highlighted ? "default" : tier.ctaVariant}
                    >
                      {tier.cta} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
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
            Compare plans feature by feature
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 bg-card border-b border-border">
                  <th className="text-left p-4 font-semibold min-w-[200px]">Feature</th>
                  <th className="p-4 font-semibold text-center min-w-[100px]">Free</th>
                  <th className="p-4 font-semibold text-center min-w-[100px]">Pro</th>
                  <th className="p-4 font-semibold text-center min-w-[100px]">
                    <span className="text-primary">Growth</span>
                  </th>
                  <th className="p-4 font-semibold text-center min-w-[100px]">Business</th>
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
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-medium">
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
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/auth" className="hover:text-foreground transition-colors">Sign in</Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} FormForge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
