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
              <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
              {t("common.backToHome")}
            </Link>
          </Button>
        </div>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1>{t("privacy.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("privacy.lastUpdated")}: March 12, 2026
          </p>

          <h2>{t("privacy.introTitle")}</h2>
          <p>{t("privacy.introBody")}</p>

          <h2>{t("privacy.dataCollectionTitle")}</h2>
          <h3>{t("privacy.accountDataTitle")}</h3>
          <ul>
            <li>{t("privacy.accountDataEmail")}</li>
            <li>{t("privacy.accountDataName")}</li>
            <li>{t("privacy.accountDataAvatar")}</li>
          </ul>

          <h3>{t("privacy.workspaceDataTitle")}</h3>
          <ul>
            <li>{t("privacy.workspaceDataName")}</li>
            <li>{t("privacy.workspaceDataForms")}</li>
            <li>{t("privacy.workspaceDataSubmissions")}</li>
            <li>{t("privacy.workspaceDataWaitlist")}</li>
            <li>{t("privacy.workspaceDataFeedback")}</li>
            <li>{t("privacy.workspaceDataTickets")}</li>
          </ul>

          <h3>{t("privacy.technicalDataTitle")}</h3>
          <ul>
            <li>{t("privacy.technicalDataBrowser")}</li>
            <li>{t("privacy.technicalDataPageViews")}</li>
            <li>{t("privacy.technicalDataErrors")}</li>
            <li>{t("privacy.technicalDataPerformance")}</li>
          </ul>

          <h2>{t("privacy.dataStorageTitle")}</h2>
          <p>{t("privacy.dataStorageIntro")}</p>
          <ul>
            <li><strong>Supabase</strong> — {t("privacy.storageSupabase")}</li>
            <li><strong>Supabase Auth</strong> — {t("privacy.storageAuth")}</li>
            <li><strong>Supabase Storage</strong> — {t("privacy.storageFiles")}</li>
            <li><strong>Vercel</strong> — {t("privacy.storageVercel")}</li>
          </ul>

          <h2>{t("privacy.dataProcessingTitle")}</h2>
          <p>{t("privacy.dataProcessingIntro")}</p>
          <ul>
            <li><strong>Stripe</strong> — {t("privacy.processingStripe")}</li>
            <li><strong>Resend</strong> — {t("privacy.processingResend")}</li>
            <li><strong>Anthropic (Claude AI)</strong> — {t("privacy.processingAi")}</li>
          </ul>

          <h2>{t("privacy.dataSharingTitle")}</h2>
          <p>{t("privacy.dataSharingIntro")}</p>
          <ul>
            <li>{t("privacy.sharingProviders")}</li>
            <li>{t("privacy.sharingLaw")}</li>
            <li>{t("privacy.sharingMembers")}</li>
          </ul>

          <h2>{t("privacy.dataRetentionTitle")}</h2>
          <p>{t("privacy.dataRetentionIntro")}</p>
          <ul>
            <li>{t("privacy.retentionProfile")}</li>
            <li>{t("privacy.retentionWorkspaces")}</li>
            <li>{t("privacy.retentionCascade")}</li>
            <li>{t("privacy.retentionBackup")}</li>
          </ul>

          <h2>{t("privacy.yourRightsTitle")}</h2>
          <p>{t("privacy.yourRightsIntro")}</p>
          <ul>
            <li>{t("privacy.rightAccess")}</li>
            <li>{t("privacy.rightExport")}</li>
            <li>{t("privacy.rightDeletion")}</li>
            <li>{t("privacy.rightRectification")}</li>
            <li>{t("privacy.rightRestriction")}</li>
            <li>{t("privacy.rightPortability")}</li>
          </ul>

          <h2>{t("privacy.cookiesTitle")}</h2>
          <p>{t("privacy.cookiesIntro")}</p>
          <ul>
            <li>{t("privacy.cookieAuth")}</li>
            <li>{t("privacy.cookieLanguage")}</li>
            <li>{t("privacy.cookieTheme")}</li>
          </ul>
          <p>{t("privacy.cookiesNoTracking")}</p>

          <h2>{t("privacy.securityTitle")}</h2>
          <p>{t("privacy.securityIntro")}</p>
          <ul>
            <li>{t("privacy.securityRls")}</li>
            <li>{t("privacy.securityTls")}</li>
            <li>{t("privacy.securityJwt")}</li>
            <li>{t("privacy.securityRbac")}</li>
            <li>{t("privacy.securityHeaders")}</li>
          </ul>

          <h2>{t("privacy.contactTitle")}</h2>
          <p>{t("privacy.contactIntro")}</p>
          <ul>
            <li dir="ltr">{t("privacy.contactEmail")}</li>
          </ul>

          <h2>{t("privacy.changesTitle")}</h2>
          <p>{t("privacy.changesBody")}</p>
        </article>
      </div>
    </div>
  );
}
