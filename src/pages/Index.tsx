import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Users,
  MessageSquare,
  Headphones,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Shield,
  BarChart3,
  Globe,
  Hammer,
  Star,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const competitors = [
  { name: "Typeform", price: 29 },
  { name: "Waitlist Tool", price: 49 },
  { name: "NPS Platform", price: 99 },
  { name: "Help Desk", price: 89 },
  { name: "Form Analytics", price: 17 },
];

const totalCompetitor = competitors.reduce((s, c) => s + c.price, 0);

export default function Index() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const modes = [
    {
      icon: FileText,
      title: t("landing.modeForms"),
      description: t("landing.modeFormsDesc"),
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      icon: Users,
      title: t("landing.modeWaitlists"),
      description: t("landing.modeWaitlistsDesc"),
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      icon: MessageSquare,
      title: t("landing.modeFeedback"),
      description: t("landing.modeFeedbackDesc"),
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      icon: Headphones,
      title: t("landing.modeSupport"),
      description: t("landing.modeSupportDesc"),
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
    },
  ];

  const features = [
    { icon: Zap, title: t("landing.featureRealtime"), description: t("landing.featureRealtimeDesc") },
    { icon: Shield, title: t("landing.featureSecure"), description: t("landing.featureSecureDesc") },
    { icon: BarChart3, title: t("landing.featureAnalytics"), description: t("landing.featureAnalyticsDesc") },
    { icon: Globe, title: t("landing.featurePublicPages"), description: t("landing.featurePublicPagesDesc") },
    { icon: FileText, title: t("landing.featureDragDrop"), description: t("landing.featureDragDropDesc") },
    { icon: Users, title: t("landing.featureTeam"), description: t("landing.featureTeamDesc") },
  ];

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
              <Button variant="ghost" size="sm">{t("landing.pricing")}</Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm">{t("landing.signIn")}</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-colored">
                {t("landing.getStartedFree")}
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,hsl(155_60%_40%/0.12),transparent)]" />
        <div className="container text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            {t("landing.badge4Tools")}
          </Badge>
          <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t("landing.heroTitle")}{" "}
            <span className="text-primary">{t("landing.heroTitleHighlight")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-colored gap-2 px-8 text-base">
                {t("landing.startFree")} {isRTL ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="gap-2 px-8 text-base">
                {t("landing.seeHowItWorks")}
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("landing.freeForever")}
          </p>
        </div>
      </section>

      {/* How It Works — 4 Mode Cards */}
      <section id="how-it-works" className="border-t border-border/40 bg-muted/30 py-20 sm:py-24">
        <div className="container">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              {t("landing.onePlatformFourSuperpowers")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {t("landing.onePlatformSubtitle")}
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {modes.map((mode) => (
              <Card key={mode.title} className="group relative overflow-hidden border-border/50 transition-all hover:shadow-lg hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${mode.bg}`}>
                    <mode.icon className={`h-6 w-6 ${mode.color}`} />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{mode.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Savings Calculator / Social Proof */}
      <section className="py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Replace 5 tools. Save <span className="text-primary">${totalCompetitor - 29}{t("landing.perMonth")}</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                {t("landing.replaceToolsSubtitle")}
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {/* Competitors */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6">
                  <h3 className="font-display text-lg font-semibold text-destructive">{t("landing.withoutFormForge")}</h3>
                  <div className="mt-4 space-y-3">
                    {competitors.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{c.name}</span>
                        <span className="font-medium">${c.price}{t("landing.perMonth")}</span>
                      </div>
                    ))}
                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="font-semibold">{t("landing.total")}</span>
                      <span className="text-lg font-bold text-destructive line-through">${totalCompetitor}{t("landing.perMonth")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FormForge */}
              <Card className="border-primary/30 bg-primary/5 shadow-colored">
                <CardContent className="p-6">
                  <h3 className="font-display text-lg font-semibold text-primary">{t("landing.withFormForgePro")}</h3>
                  <div className="mt-4 space-y-3">
                    {modes.map((m) => (
                      <div key={m.title} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-muted-foreground">{m.title}</span>
                        <span className="ltr:ml-auto rtl:mr-auto text-xs text-primary font-medium">{t("landing.included")}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{t("landing.analyticsDashboards")}</span>
                      <span className="ltr:ml-auto rtl:mr-auto text-xs text-primary font-medium">{t("landing.included")}</span>
                    </div>
                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="font-semibold">{t("landing.total")}</span>
                      <span className="text-lg font-bold text-primary">$29{t("landing.perMonth")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="flex ltr:-space-x-2 rtl:-space-x-2 rtl:space-x-reverse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="ltr:ml-1 rtl:mr-1">{t("landing.lovedByTeams", { count: 500 })}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-border/40 bg-muted/30 py-20 sm:py-24">
        <div className="container">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              {t("landing.everythingYouNeed")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {t("landing.everythingSubtitle")}
            </p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-24">
        <div className="container">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl gradient-primary p-10 text-center shadow-colored sm:p-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(155_80%_60%/0.3),transparent_50%)]" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
                {t("landing.readyToSimplify")}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
                {t("landing.readySubtitle", { count: 500 })}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="gap-2 px-8 text-base font-semibold">
                    {t("landing.getStartedFree")} {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
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
              <Link to="/pricing" className="hover:text-foreground transition-colors">{t("landing.pricing")}</Link>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">{t("landing.features")}</a>
              <Link to="/auth" className="hover:text-foreground transition-colors">{t("landing.signIn")}</Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} FormForge. {t("landing.allRightsReserved")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
