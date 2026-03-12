import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common.backToHome", "Back to Home")}
            </Link>
          </Button>
        </div>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1>{t("privacy.title", "Privacy Policy")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("privacy.lastUpdated", "Last updated")}: March 12, 2026
          </p>

          <h2>{t("privacy.introTitle", "Introduction")}</h2>
          <p>
            FormForge (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use our platform at formforge.app (the &quot;Service&quot;).
          </p>

          <h2>{t("privacy.dataCollectionTitle", "Data We Collect")}</h2>
          <h3>{t("privacy.accountDataTitle", "Account Data")}</h3>
          <ul>
            <li>Email address (required for authentication)</li>
            <li>Full name (optional profile field)</li>
            <li>Avatar image (optional)</li>
          </ul>

          <h3>{t("privacy.workspaceDataTitle", "Workspace Data")}</h3>
          <ul>
            <li>Workspace name and configuration</li>
            <li>Forms, form fields, and form settings</li>
            <li>Form submissions and responses</li>
            <li>Waitlist entries (email, name, referral data)</li>
            <li>Feedback responses (NPS scores, comments)</li>
            <li>Support tickets and messages</li>
          </ul>

          <h3>{t("privacy.technicalDataTitle", "Technical Data")}</h3>
          <ul>
            <li>Browser type and version</li>
            <li>Page views and navigation patterns</li>
            <li>Error logs (for service reliability)</li>
            <li>Performance metrics (page load times)</li>
          </ul>

          <h2>{t("privacy.dataStorageTitle", "How We Store Your Data")}</h2>
          <p>
            Your data is stored securely using the following services:
          </p>
          <ul>
            <li><strong>Supabase</strong> (PostgreSQL database): All application data including profiles, forms, submissions,
              and workspace data. Data is encrypted at rest (AES-256) and in transit (TLS 1.2+).
              Hosted on AWS in the US region.</li>
            <li><strong>Supabase Auth</strong>: Authentication tokens and session management.</li>
            <li><strong>Supabase Storage</strong>: Uploaded images (branding, avatars).</li>
            <li><strong>Vercel</strong>: Frontend hosting and CDN delivery. No user data stored on Vercel servers.</li>
          </ul>

          <h2>{t("privacy.dataProcessingTitle", "Data Processing")}</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul>
            <li><strong>Stripe</strong>: Payment processing for subscriptions. We do not store credit card details.
              Stripe&apos;s privacy policy applies to payment data.</li>
            <li><strong>Resend</strong>: Transactional email delivery (waitlist invitations, ticket notifications).
              Email addresses and message content are processed by Resend.</li>
            <li><strong>Anthropic (Claude AI)</strong>: AI-powered features (form generation, ticket classification).
              Form content may be sent to Anthropic&apos;s API for processing.
              Anthropic does not use this data for training.</li>
          </ul>

          <h2>{t("privacy.dataSharingTitle", "Data Sharing")}</h2>
          <p>
            We do not sell your personal data. We share data only with:
          </p>
          <ul>
            <li>Third-party service providers listed above (for service operation)</li>
            <li>Law enforcement (when legally required)</li>
            <li>Workspace members (within the same workspace, as configured by the workspace owner)</li>
          </ul>

          <h2>{t("privacy.dataRetentionTitle", "Data Retention")}</h2>
          <p>
            We retain your data for as long as your account is active. When you delete your account:
          </p>
          <ul>
            <li>All profile data is permanently deleted</li>
            <li>All workspaces you own (and their forms, submissions, etc.) are permanently deleted</li>
            <li>Deletion is cascading and irreversible</li>
            <li>Backup data is purged within 30 days of deletion</li>
          </ul>

          <h2>{t("privacy.yourRightsTitle", "Your Rights")}</h2>
          <p>
            Under GDPR and applicable data protection laws, you have the right to:
          </p>
          <ul>
            <li><strong>Access</strong>: View all data we hold about you (available in Settings &gt; Data Export)</li>
            <li><strong>Export</strong>: Download your data in JSON format (available in Settings &gt; Data Export)</li>
            <li><strong>Deletion</strong>: Delete your account and all associated data (available in Settings &gt; Delete Account)</li>
            <li><strong>Rectification</strong>: Update or correct your personal data (available in Settings &gt; Profile)</li>
            <li><strong>Restriction</strong>: Request we limit processing of your data</li>
            <li><strong>Portability</strong>: Receive your data in a structured, machine-readable format</li>
          </ul>

          <h2>{t("privacy.cookiesTitle", "Cookies & Local Storage")}</h2>
          <p>
            FormForge uses browser localStorage for:
          </p>
          <ul>
            <li>Authentication session tokens (Supabase Auth)</li>
            <li>User language preference</li>
            <li>Theme preference (light/dark mode)</li>
          </ul>
          <p>
            We do not use tracking cookies. No third-party advertising cookies are set.
          </p>

          <h2>{t("privacy.securityTitle", "Security")}</h2>
          <p>
            We implement the following security measures:
          </p>
          <ul>
            <li>Row-Level Security (RLS) on all database tables</li>
            <li>Encrypted connections (TLS 1.2+)</li>
            <li>JWT-based authentication with automatic token refresh</li>
            <li>Role-based access control (owner, editor, viewer)</li>
            <li>Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)</li>
          </ul>

          <h2>{t("privacy.contactTitle", "Contact Us")}</h2>
          <p>
            For privacy-related inquiries, data requests, or concerns, contact us at:
          </p>
          <ul>
            <li>Email: privacy@formforge.app</li>
          </ul>

          <h2>{t("privacy.changesTitle", "Changes to This Policy")}</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of material
            changes via email or an in-app notification. Continued use of the Service after changes
            constitutes acceptance of the updated policy.
          </p>
        </article>
      </div>
    </div>
  );
}
