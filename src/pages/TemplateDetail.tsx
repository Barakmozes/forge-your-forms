// === AGENT 11: Template Detail Page ===
import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTemplate } from "@/hooks/useTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Hammer, ArrowLeft, Users, FileText, MessageSquare, Headphones, LayoutTemplate } from "lucide-react";
import TemplatePreview from "@/components/templates/TemplatePreview";
import TemplateCard from "@/components/templates/TemplateCard";
import UseTemplateButton from "@/components/templates/UseTemplateButton";

const MODE_ICONS: Record<string, React.ElementType> = {
  standard: FileText,
  waitlist: Users,
  feedback: MessageSquare,
  support: Headphones,
};

const MODE_COLORS: Record<string, string> = {
  standard: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  waitlist: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  feedback: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  support: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function TemplateDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { template, loading, relatedTemplates } = useTemplate(slug || "");

  // SEO: Set document title
  useEffect(() => {
    if (template) {
      document.title = `${template.title} — Free Template | FormForge`;
    }
    return () => { document.title = "FormForge"; };
  }, [template]);

  // SEO: Set meta description
  useEffect(() => {
    if (template?.description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = template.description;
    }
  }, [template]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Template not found.</p>
        <Button variant="outline" onClick={() => navigate("/templates")}>
          Browse Templates
        </Button>
      </div>
    );
  }

  const ModeIcon = MODE_ICONS[template.mode] || FileText;

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
          <nav className="ms-auto flex items-center gap-2">
            <Link to="/templates">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <LayoutTemplate className="h-4 w-4" />
                All Templates
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-colored">
                Get Started Free
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="container py-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate("/templates")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Templates
        </Button>
      </div>

      {/* Content */}
      <div className="container pb-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <ModeIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold sm:text-3xl">
                    {template.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className={`text-xs ${MODE_COLORS[template.mode] || ""}`}>
                      {template.mode}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    {template.industry && template.industry !== "General" && (
                      <Badge variant="outline" className="text-xs">
                        {template.industry}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {template.description}
              </p>
              {template.use_count > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Used by {template.use_count} {template.use_count === 1 ? "team" : "teams"}
                </p>
              )}
            </div>

            <Separator />

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Form Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <TemplatePreview
                  fields={(template.fields || []) as { id: string; type: string; label: string; placeholder?: string; helpText?: string; required?: boolean; options?: string[] }[]}
                  mode={template.mode}
                />
              </CardContent>
            </Card>

            {/* Settings info */}
            {template.settings && Object.keys(template.settings).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Template Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(template.settings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="font-medium">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-20">
              <CardContent className="p-6 space-y-4">
                <UseTemplateButton template={template} slug={slug || ""} />
                <p className="text-xs text-center text-muted-foreground">
                  Free to use. Creates a draft form in your workspace.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related templates */}
        {relatedTemplates.length > 0 && (
          <div className="mt-16">
            <Separator className="mb-8" />
            <h2 className="font-display text-xl font-bold mb-6">Related Templates</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedTemplates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} FormForge. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
