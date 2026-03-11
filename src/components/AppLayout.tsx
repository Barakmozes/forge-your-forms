import { ReactNode } from "react";
import Navbar from "./Navbar";
// === AGENT 6: Subscription status banner ===
import SubscriptionStatus from "@/components/billing/SubscriptionStatus";
// === END AGENT 6 ===
// === AGENT 7: Usage Banner ===
import UsageBanner from "@/components/upgrade/UsageBanner";
// === END AGENT 7 ===

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* === AGENT 6: Subscription status banner === */}
      <SubscriptionStatus />
      {/* === END AGENT 6 === */}
      {/* === AGENT 7: Usage Banner === */}
      <UsageBanner />
      {/* === END AGENT 7 === */}
      <main className="container py-6">{children}</main>
    </div>
  );
}
