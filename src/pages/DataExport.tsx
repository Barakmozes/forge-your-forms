import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, FileJson, Loader2 } from "lucide-react";

interface ExportData {
  exportedAt: string;
  profile: Record<string, unknown> | null;
  workspaces: Record<string, unknown>[];
  forms: Record<string, unknown>[];
  submissions: Record<string, unknown>[];
  waitlistEntries: Record<string, unknown>[];
  feedbackResponses: Record<string, unknown>[];
  tickets: Record<string, unknown>[];
}

export default function DataExport() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { workspaces } = useWorkspace();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    setProgress(0);

    try {
      // 1. Profile
      setProgress(10);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // 2. Workspaces
      setProgress(20);
      const workspaceIds = workspaces.map((w) => w.id);
      const { data: workspaceData } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", workspaceIds);

      // 3. Forms
      setProgress(35);
      const { data: forms } = await supabase
        .from("forms")
        .select("*")
        .in("workspace_id", workspaceIds);

      const formIds = (forms || []).map((f) => f.id);

      // 4. Submissions
      setProgress(50);
      const { data: submissions } = formIds.length > 0
        ? await supabase.from("submissions").select("*").in("form_id", formIds)
        : { data: [] };

      // 5. Waitlist entries
      setProgress(65);
      const { data: waitlistEntries } = formIds.length > 0
        ? await supabase.from("waitlist_entries").select("*").in("form_id", formIds)
        : { data: [] };

      // 6. Feedback responses
      setProgress(80);
      const { data: feedbackResponses } = formIds.length > 0
        ? await supabase.from("feedback_responses").select("*").in("form_id", formIds)
        : { data: [] };

      // 7. Tickets
      setProgress(90);
      const { data: tickets } = formIds.length > 0
        ? await supabase.from("tickets").select("*").in("form_id", formIds)
        : { data: [] };

      // Package export
      setProgress(95);
      const exportData: ExportData = {
        exportedAt: new Date().toISOString(),
        profile: profile || null,
        workspaces: workspaceData || [],
        forms: forms || [],
        submissions: submissions || [],
        waitlistEntries: waitlistEntries || [],
        feedbackResponses: feedbackResponses || [],
        tickets: tickets || [],
      };

      // Trigger download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `formforge-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast({ title: t("gdpr.dataExport.success"), description: t("gdpr.dataExport.downloaded") });
    } catch (err) {
      console.error("Export failed:", err);
      toast({ title: t("gdpr.dataExport.failed"), description: t("gdpr.dataExport.tryAgain"), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t("gdpr.dataExport.title")}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              {t("gdpr.dataExport.cardTitle")}
            </CardTitle>
            <CardDescription>
              {t("gdpr.dataExport.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground space-y-2">
              <p>{t("gdpr.dataExport.includesLabel")}:</p>
              <ul className="list-disc ps-5 space-y-1">
                <li>{t("gdpr.dataExport.profileData")}</li>
                <li>{t("gdpr.dataExport.workspaceData")}</li>
                <li>{t("gdpr.dataExport.formData")}</li>
                <li>{t("gdpr.dataExport.submissionData")}</li>
                <li>{t("gdpr.dataExport.waitlistData")}</li>
                <li>{t("gdpr.dataExport.feedbackData")}</li>
                <li>{t("gdpr.dataExport.ticketData")}</li>
              </ul>
            </div>

            {exporting && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  {t("gdpr.dataExport.exporting")} {progress}%
                </p>
              </div>
            )}

            <Button onClick={handleExport} disabled={exporting} className="w-full">
              {exporting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("gdpr.dataExport.exporting")}
                </>
              ) : (
                <>
                  <Download className="me-2 h-4 w-4" />
                  {t("gdpr.dataExport.exportButton")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
