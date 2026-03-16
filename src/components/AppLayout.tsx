import { ReactNode, useEffect } from "react";
import Navbar from "./Navbar";
// === AGENT 6: Subscription status banner ===
import SubscriptionStatus from "@/components/billing/SubscriptionStatus";
// === END AGENT 6 ===
// === AGENT 7: Usage Banner ===
import UsageBanner from "@/components/upgrade/UsageBanner";
// === END AGENT 7 ===
// === AGENT 14: White Label CSS Override ===
import { useEnterprise } from "@/hooks/useEnterprise";
import { hexToHsl } from "@/lib/domains";
// === END AGENT 14 ===

export default function AppLayout({ children }: { children: ReactNode }) {
  // === AGENT 14: White Label CSS Override ===
  const { settings: enterprise, whiteLabelEnabled } = useEnterprise();

  useEffect(() => {
    if (!whiteLabelEnabled || !enterprise) return;

    // Inject custom primary color as CSS variables
    if (enterprise.custom_primary_color) {
      const hsl = hexToHsl(enterprise.custom_primary_color);
      if (hsl) {
        document.documentElement.style.setProperty("--primary", hsl);
        document.documentElement.style.setProperty("--ring", hsl);
        document.documentElement.style.setProperty("--sidebar-primary", hsl);
      }
    }

    // Inject custom favicon
    if (enterprise.custom_favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = enterprise.custom_favicon_url;
    }

    // Update page title
    if (enterprise.custom_app_name) {
      document.title = enterprise.custom_app_name;
    }

    return () => {
      // Restore defaults on unmount
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
      document.documentElement.style.removeProperty("--sidebar-primary");
    };
  }, [whiteLabelEnabled, enterprise]);
  // === END AGENT 14 ===

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* === AGENT 16: Skip-to-content link (WCAG 2.4.1) === */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* === END AGENT 16 === */}
      <Navbar />
      {/* === AGENT 6: Subscription status banner === */}
      <SubscriptionStatus />
      {/* === END AGENT 6 === */}
      {/* === AGENT 7: Usage Banner === */}
      <UsageBanner />
      {/* === END AGENT 7 === */}
      <main id="main-content" tabIndex={-1} className="container py-4 sm:py-6">{children}</main>
    </div>
  );
}
