// === AGENT 11: Templates Gallery Page ===
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Hammer, LayoutTemplate } from "lucide-react";
import TemplateBrowser from "@/components/templates/TemplateBrowser";

export default function Templates() {
  // SEO: Page title and meta description
  useEffect(() => {
    document.title = "Free Form Templates — FormForge";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = "Browse 20+ free form templates for contact forms, waitlists, NPS surveys, bug reports, job applications, and more. Get started in seconds with FormForge.";
    return () => { document.title = "FormForge"; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Simple navbar for public page */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-colored">
              <Hammer className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>FormForge</span>
          </Link>
          <nav className="ms-auto flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
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
      <section className="border-b border-border/40 bg-muted/30 py-12 sm:py-16">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Free Form Templates
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Get started quickly with professionally designed templates for forms, waitlists, surveys, and support.
          </p>
        </div>
      </section>

      {/* Browser */}
      <section className="container py-8">
        <TemplateBrowser />
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} FormForge. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
