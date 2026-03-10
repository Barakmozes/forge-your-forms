import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Users,
  MessageSquare,
  Headphones,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  BarChart3,
  Globe,
  Hammer,
  Star,
  ChevronRight,
} from "lucide-react";

const modes = [
  {
    icon: FileText,
    title: "Forms",
    description: "Drag-and-drop form builder with conditional logic and real-time submissions.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    icon: Users,
    title: "Waitlists",
    description: "Viral waitlist pages with referral tracking, leaderboards, and invite management.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    icon: MessageSquare,
    title: "Feedback & NPS",
    description: "NPS surveys with sentiment analysis, trend charts, and detractor alerts.",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    icon: Headphones,
    title: "Support Tickets",
    description: "Ticket system with SLA tracking, canned responses, tags, and customer portal.",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/40",
  },
];

const features = [
  { icon: Zap, title: "Real-time Updates", description: "Live data with Supabase Realtime — no polling, no refresh." },
  { icon: Shield, title: "Secure by Default", description: "Row-level security, workspace isolation, and encrypted auth." },
  { icon: BarChart3, title: "Built-in Analytics", description: "NPS trends, referral leaderboards, SLA dashboards — out of the box." },
  { icon: Globe, title: "Public Pages", description: "Shareable forms, surveys, and waitlists with custom branding." },
  { icon: FileText, title: "Drag & Drop Builder", description: "Visual form editor with 10+ field types and live preview." },
  { icon: Users, title: "Team Workspaces", description: "Invite your team with owner, editor, and viewer roles." },
];

const competitors = [
  { name: "Typeform", price: 29 },
  { name: "Waitlist Tool", price: 49 },
  { name: "NPS Platform", price: 99 },
  { name: "Help Desk", price: 89 },
  { name: "Form Analytics", price: 17 },
];

const totalCompetitor = competitors.reduce((s, c) => s + c.price, 0);

export default function Index() {
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

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,hsl(155_60%_40%/0.12),transparent)]" />
        <div className="container text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            4 tools in 1 platform
          </Badge>
          <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Forms, Waitlists, Feedback & Support{" "}
            <span className="text-primary">in One Platform</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Stop juggling 4 different tools. FormForge replaces your form builder, waitlist manager,
            NPS survey tool, and help desk — all for a fraction of the cost.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-colored gap-2 px-8 text-base">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="gap-2 px-8 text-base">
                See How It Works
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free forever for small teams. No credit card required.
          </p>
        </div>
      </section>

      {/* How It Works — 4 Mode Cards */}
      <section id="how-it-works" className="border-t border-border/40 bg-muted/30 py-20 sm:py-24">
        <div className="container">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              One platform, four superpowers
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Each mode transforms FormForge into a specialized tool — with its own public pages,
              dashboards, and analytics.
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
                Replace 5 tools. Save <span className="text-primary">${totalCompetitor - 29}/mo</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                See what you're paying for separate tools — and what you'd pay with FormForge.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {/* Competitors */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6">
                  <h3 className="font-display text-lg font-semibold text-destructive">Without FormForge</h3>
                  <div className="mt-4 space-y-3">
                    {competitors.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{c.name}</span>
                        <span className="font-medium">${c.price}/mo</span>
                      </div>
                    ))}
                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-lg font-bold text-destructive line-through">${totalCompetitor}/mo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FormForge */}
              <Card className="border-primary/30 bg-primary/5 shadow-colored">
                <CardContent className="p-6">
                  <h3 className="font-display text-lg font-semibold text-primary">With FormForge Pro</h3>
                  <div className="mt-4 space-y-3">
                    {modes.map((m) => (
                      <div key={m.title} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-muted-foreground">{m.title}</span>
                        <span className="ml-auto text-xs text-primary font-medium">Included</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">Analytics & Dashboards</span>
                      <span className="ml-auto text-xs text-primary font-medium">Included</span>
                    </div>
                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-lg font-bold text-primary">$29/mo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="flex -space-x-2">
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
                <span className="ml-1">Loved by 500+ teams</span>
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
              Everything you need, nothing you don't
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Built for teams who want powerful tools without the bloat.
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
                Ready to simplify your stack?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
                Join 500+ teams who replaced their patchwork of tools with FormForge. Start free — no credit card needed.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="gap-2 px-8 text-base font-semibold">
                    Get Started Free <ChevronRight className="h-4 w-4" />
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
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">Features</a>
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
