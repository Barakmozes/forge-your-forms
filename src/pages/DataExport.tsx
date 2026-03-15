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
  notifications: Record<string, unknown>[];
  waitlistEntries: Record<string, unknown>[];
  waitlistInvites: Record<string, unknown>[];
  feedbackResponses: Record<string, unknown>[];
  feedbackAlerts: Record<string, unknown>[];
  tickets: Record<string, unknown>[];
  ticketMessages: Record<string, unknown>[];
  cannedResponses: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  ticketTags: Record<string, unknown>[];
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
      setProgress(5);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // 2. Workspaces
      setProgress(10);
      const workspaceIds = workspaces.map((w) => w.id);
      const { data: workspaceData } = workspaceIds.length > 0
        ? await supabase.from("workspaces").select("*").in("id", workspaceIds)
        : { data: [] };

      // 3. Forms
      setProgress(20);
      const { data: forms } = workspaceIds.length > 0
        ? await supabase.from("forms").select("*").in("workspace_id", workspaceIds)
        : { data: [] };

      const formIds = (forms || []).map((f) => f.id);

      // 4. Submissions
      setProgress(28);
      const { data: submissions } = formIds.length > 0
        ? await supabase.from("submissions").select("*").in("form_id", formIds)
        : { data: [] };

      // 5. Notifications
      setProgress(35);
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id);

      // 6. Waitlist entries
      setProgress(42);
      const { data: waitlistEntries } = formIds.length > 0
        ? await supabase.from("waitlist_entries").select("*").in("form_id", formIds)
        : { data: [] };

      // 7. Waitlist invites (via entry IDs)
      setProgress(48);
      const waitlistEntryIds = (waitlistEntries || []).map((e) => e.id);
      const { data: waitlistInvites } = waitlistEntryIds.length > 0
        ? await supabase.from("waitlist_invites").select("*").in("entry_id", waitlistEntryIds)
        : { data: [] };

      // 8. Feedback responses
      setProgress(55);
      const { data: feedbackResponses } = formIds.length > 0
        ? await supabase.from("feedback_responses").select("*").in("form_id", formIds)
        : { data: [] };

      // 9. Feedback alerts
      setProgress(61);
      const feedbackResponseIds = (feedbackResponses || []).map((r) => r.id);
      const { data: feedbackAlerts } = feedbackResponseIds.length > 0
        ? await supabase.from("feedback_alerts").select("*").in("response_id", feedbackResponseIds)
        : { data: [] };

      // 10. Tickets
      setProgress(68);
      const { data: tickets } = formIds.length > 0
        ? await supabase.from("tickets").select("*").in("form_id", formIds)
        : { data: [] };

      // 11. Ticket messages
      setProgress(74);
      const ticketIds = (tickets || []).map((tk) => tk.id);
      const { data: ticketMessages } = ticketIds.length > 0
        ? await supabase.from("ticket_messages").select("*").in("ticket_id", ticketIds)
        : { data: [] };

      // 12. Canned responses
      setProgress(80);
      const { data: cannedResponses } = workspaceIds.length > 0
        ? await supabase.from("canned_responses").select("*").in("workspace_id", workspaceIds)
        : { data: [] };

      // 13. Tags
      setProgress(86);
      const { data: tags } = workspaceIds.length > 0
        ? await supabase.from("tags").select("*").in("workspace_id", workspaceIds)
        : { data: [] };

      // 14. Ticket tags
      setProgress(92);
      const { data: ticketTags } = ticketIds.length > 0
        ? await supabase.from("ticket_tags").select("*").in("ticket_id", ticketIds)
        : { data: [] };

      // Package export
      setProgress(97);
      const exportData: ExportData = {
        exportedAt: new Date().toISOString(),
        profile: profile || null,
        workspaces: workspaceData || [],
        forms: forms || [],
        submissions: submissions || [],
        notifications: notifications || [],
        waitlistEntries: waitlistEntries || [],
        waitlistInvites: waitlistInvites || [],
        feedbackResponses: feedbackResponses || [],
        feedbackAlerts: feedbackAlerts || [],
        tickets: tickets || [],
        ticketMessages: ticketMessages || [],
        cannedResponses: cannedResponses || [],
        tags: tags || [],
        ticketTags: ticketTags || [],
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
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("gdpr.dataExport.failed"), description: message, variant: "destructive" });
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
                <li>{t("gdpr.dataExport.notificationData")}</li>
                <li>{t("gdpr.dataExport.waitlistData")}</li>
                <li>{t("gdpr.dataExport.feedbackData")}</li>
                <li>{t("gdpr.dataExport.ticketData")}</li>
                <li>{t("gdpr.dataExport.ticketMessagesData")}</li>
                <li>{t("gdpr.dataExport.cannedResponsesData")}</li>
                <li>{t("gdpr.dataExport.tagsData")}</li>
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
