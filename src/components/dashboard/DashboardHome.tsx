import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Inbox,
  TrendingUp,
  CalendarDays,
  Plus,
  ArrowRight,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { format, parseISO, startOfMonth, startOfDay, isWithinInterval } from "date-fns";

interface DashboardForm {
  id: string;
  title: string;
  mode: string;
  status: string;
  submission_count: number;
  updated_at: string;
}

interface RecentSubmission {
  id: string;
  form_id: string;
  submitted_by_email: string | null;
  submitted_at: string;
}

interface DashboardHomeProps {
  onCreateForm: () => void;
}

export default function DashboardHome({ onCreateForm }: DashboardHomeProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspaceId = currentWorkspace?.id;

  // Fetch forms
  const { data: forms = [] } = useQuery({
    queryKey: ["dashboard-forms", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("id, title, mode, status, submission_count, updated_at")
        .eq("workspace_id", workspaceId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DashboardForm[];
    },
    enabled: !!workspaceId,
  });

  // Fetch recent submissions (last 10)
  const formIds = useMemo(() => forms.map((f) => f.id), [forms]);
  const { data: recentSubs = [] } = useQuery({
    queryKey: ["dashboard-recent-subs", workspaceId, formIds],
    queryFn: async () => {
      if (formIds.length === 0) return [];
      const { data, error } = await supabase
        .from("submissions")
        .select("id, form_id, submitted_by_email, submitted_at")
        .in("form_id", formIds)
        .order("submitted_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as RecentSubmission[];
    },
    enabled: !!workspaceId && formIds.length > 0,
  });

  // Fetch this month's submission count
  const { data: monthlyCount = 0 } = useQuery({
    queryKey: ["dashboard-monthly-count", workspaceId, formIds],
    queryFn: async () => {
      if (formIds.length === 0) return 0;
      const monthStart = startOfMonth(new Date()).toISOString();
      const { count, error } = await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .in("form_id", formIds)
        .gte("submitted_at", monthStart);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!workspaceId && formIds.length > 0,
  });

  // Compute today's count
  const todayCount = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = new Date();
    return recentSubs.filter((s) => {
      const dt = parseISO(s.submitted_at);
      return isWithinInterval(dt, { start: todayStart, end: todayEnd });
    }).length;
  }, [recentSubs]);

  // Most active form
  const mostActive = useMemo(() => {
    if (forms.length === 0) return null;
    return forms.reduce((best, f) =>
      f.submission_count > (best?.submission_count ?? 0) ? f : best,
      forms[0]
    );
  }, [forms]);

  const getFormTitle = (formId: string) =>
    forms.find((f) => f.id === formId)?.title ?? "Unknown";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greetingMorning");
    if (hour < 18) return t("dashboard.greetingAfternoon");
    return t("dashboard.greetingEvening");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-display font-bold">
          {greeting}, {displayName}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("dashboard.overview")}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.totalForms")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{forms.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.thisMonth")}
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCount}</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.submissionsLabel")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.today")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.submissionsLabel")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.mostActive")}
            </CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {mostActive ? (
              <>
                <div className="text-sm font-semibold truncate">
                  {mostActive.title}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mostActive.submission_count} {t("dashboard.responses")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("dashboard.noFormsYet")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Recent Submissions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Submissions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {t("dashboard.recentSubmissions")}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => navigate("/submissions")}
              >
                {t("dashboard.viewAll")} <ArrowIcon className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentSubs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("dashboard.noSubmissionsYet")}
                </p>
              ) : (
                <div className="space-y-3">
                  {recentSubs.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">
                          {getFormTitle(sub.form_id)}
                        </span>
                        {sub.submitted_by_email && (
                          <span className="text-muted-foreground truncate hidden sm:inline" dir="ltr">
                            {sub.submitted_by_email}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap" dir="ltr">
                        {format(parseISO(sub.submitted_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t("dashboard.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={onCreateForm}
            >
              <Plus className="h-4 w-4" /> {t("dashboard.createNewForm")}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate("/submissions")}
            >
              <Inbox className="h-4 w-4" /> {t("dashboard.viewAllSubmissions")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
