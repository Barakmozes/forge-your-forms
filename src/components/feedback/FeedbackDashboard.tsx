import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useFeedback } from "@/hooks/useFeedback";
import { useFeedbackAnalytics, type DateRange } from "@/hooks/useFeedbackAnalytics";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  AlertTriangle,
  Flag,
  Copy,
  Users,
  BarChart2,
} from "lucide-react";
import { toast } from "sonner";
// === AGENT 12: AI Summary ===
import { useMemo } from "react";
import AiSummaryWidget from "@/components/ai/AiSummaryWidget";
import type { AiSubmissionInput } from "@/lib/ai";
// === END AGENT 12 ===

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackDashboardProps {
  formId: string;
  formTitle: string;
  formStatus: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  promoter: "#22c55e",
  passive: "#eab308",
  detractor: "#ef4444",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeek(weekStr: string): string {
  const date = new Date(weekStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNpsColor(score: number): string {
  if (score < 0) return "text-red-600 dark:text-red-400";
  if (score <= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function getNpsBgColor(score: number): string {
  if (score < 0) return "bg-red-100 dark:bg-red-900/30";
  if (score <= 50) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-green-100 dark:bg-green-900/30";
}

function formatPercentage(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip Components ────────────────────────────────────────────────

function NpsTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium mb-1">{formatWeek(label ?? "")}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full ltr:mr-1.5 rtl:ml-1.5"
            style={{ backgroundColor: entry.color }}
          />
          NPS:{" "}
          <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function VolumeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium mb-1">{formatDate(label ?? "")}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full ltr:mr-1.5 rtl:ml-1.5"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}:{" "}
          <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { category: string; count: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium mb-1">{item.payload.category}</p>
      <p className="text-muted-foreground">
        NPS: <span className="font-medium text-foreground">{item.value}</span>
      </p>
      <p className="text-muted-foreground">
        Responses:{" "}
        <span className="font-medium text-foreground">{item.payload.count}</span>
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeedbackDashboard({
  formId,
  formTitle,
  formStatus,
}: FeedbackDashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { responses, alerts, loading, toggleFlag, markAlertRead } =
    useFeedback(formId);

  const [dateRange, setDateRange] = useState<DateRange>("all");

  const {
    npsScore,
    npsDelta,
    breakdown,
    weeklyTrend,
    volumeBySentiment,
    categoryBreakdown,
    atRiskClients,
    totalResponses,
  } = useFeedbackAnalytics(responses, dateRange);

  const [copiedLink, setCopiedLink] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set()
  );

  const publicLink = `${window.location.origin}/f/${formId}`;

  const unreadAlerts = alerts.filter(
    (a) => !a.read && !dismissedAlerts.has(a.id)
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopiedLink(true);
      toast.success(t('feedback.surveyLinkCopied'));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error(t('feedback.failedCopy'));
    }
  }

  async function handleToggleFlag(responseId: string, currentFlagged: boolean) {
    const { error } = await toggleFlag(responseId, !currentFlagged);
    if (error) {
      toast.error(t('feedback.failedUpdateFlag'));
    } else {
      toast.success(currentFlagged ? t('feedback.flagRemoved') : t('feedback.responseFlagged'));
    }
  }

  async function handleDismissAlert(alertId: string) {
    const { error } = await markAlertRead(alertId);
    if (!error) {
      setDismissedAlerts((prev) => new Set(prev).add(alertId));
    }
  }

  // ─── Donut Chart Data ───────────────────────────────────────────────────────

  const donutData = [
    { name: t('feedback.promoters'), value: breakdown.promoters, color: COLORS.promoter },
    { name: t('feedback.passives'), value: breakdown.passives, color: COLORS.passive },
    { name: t('feedback.detractors'), value: breakdown.detractors, color: COLORS.detractor },
  ];

  // === AGENT 12: AI Summary ===
  const aiSubmissions: AiSubmissionInput[] = useMemo(
    () =>
      responses
        .filter((r) => r.follow_up || r.category)
        .map((r) => ({
          id: r.id,
          text_fields: {
            ...(r.follow_up ? { feedback: r.follow_up } : {}),
            ...(r.category ? { category: r.category } : {}),
          },
        })),
    [responses]
  );
  // === END AGENT 12 ===

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      {!loading && unreadAlerts.length > 0 && (
        <div className="space-y-2">
          {unreadAlerts.map((alert) => (
            <Alert key={alert.id} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span className="flex-1">
                  <span className="font-medium capitalize">
                    {alert.alert_type.replace("_", " ")}
                  </span>
                  {alert.message && (
                    <span className="text-muted-foreground">
                      {" "}
                      &mdash; {alert.message}
                    </span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 text-xs"
                  onClick={() => handleDismissAlert(alert.id)}
                >
                  {t('feedback.dismiss')}
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* === AGENT 12: AI Summary === */}
      <AiSummaryWidget formId={formId} submissions={aiSubmissions} />
      {/* === END AGENT 12 === */}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge
            variant={formStatus === "active" ? "default" : "secondary"}
          >
            {formStatus}
          </Badge>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {totalResponses.toLocaleString()} {totalResponses !== 1 ? t('feedback.responses') : t('feedback.response')}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border rounded-md">
            {(["7d", "30d", "90d", "all"] as const).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? "default" : "ghost"}
                size="sm"
                className="h-8 px-3 rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => setDateRange(range)}
              >
                {range === "all" ? "All" : range}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4" />
            {copiedLink ? t('feedback.copied') : t('feedback.copySurveyLink')}
          </Button>
        </div>
      </div>

      {/* Stats Row (3 cards) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* NPS Score Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('feedback.npsScore')}
              </CardTitle>
              <div className={`rounded-md p-2 ${getNpsBgColor(npsScore)}`}>
                <BarChart2 className={`h-4 w-4 ${getNpsColor(npsScore)}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold tabular-nums ${getNpsColor(npsScore)}`}>
                  {npsScore > 0 ? "+" : ""}
                  {npsScore}
                </span>
                {npsDelta !== null && (
                  <span
                    className={`flex items-center gap-0.5 text-sm font-medium ${
                      npsDelta >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {npsDelta >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {npsDelta > 0 ? "+" : ""}
                    {npsDelta}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {npsDelta !== null ? t('feedback.vsPreviousPeriod') : t('feedback.npsRange')}
              </p>
            </CardContent>
          </Card>

          {/* Breakdown Donut Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('feedback.sentimentBreakdown')}
              </CardTitle>
              <div className="rounded-md p-2 bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              {breakdown.total === 0 ? (
                <div className="flex items-center justify-center h-[140px] text-muted-foreground text-sm">
                  {t('feedback.noResponsesYet')}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-[120px] h-[120px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={55}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const item = payload[0];
                            return (
                              <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
                                <p className="font-medium">
                                  {item.name}:{" "}
                                  <span className="tabular-nums">
                                    {(item.value as number).toLocaleString()}
                                  </span>
                                </p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1.5 text-sm min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS.promoter }}
                      />
                      <span className="text-muted-foreground truncate">{t('feedback.promoters')}</span>
                      <span className="font-medium tabular-nums ltr:ml-auto rtl:mr-auto">
                        {breakdown.promoters}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums w-10 text-right">
                        {formatPercentage(breakdown.promoters, breakdown.total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS.passive }}
                      />
                      <span className="text-muted-foreground truncate">{t('feedback.passives')}</span>
                      <span className="font-medium tabular-nums ltr:ml-auto rtl:mr-auto">
                        {breakdown.passives}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums w-10 text-right">
                        {formatPercentage(breakdown.passives, breakdown.total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS.detractor }}
                      />
                      <span className="text-muted-foreground truncate">{t('feedback.detractors')}</span>
                      <span className="font-medium tabular-nums ltr:ml-auto rtl:mr-auto">
                        {breakdown.detractors}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums w-10 text-right">
                        {formatPercentage(breakdown.detractors, breakdown.total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Responses Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('feedback.totalResponses')}
              </CardTitle>
              <div className="rounded-md p-2 bg-purple-100 dark:bg-purple-900/30">
                <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums">
                  {totalResponses.toLocaleString()}
                </span>
                {weeklyTrend.length >= 2 && (
                  <span
                    className={`flex items-center gap-0.5 text-sm font-medium ${
                      weeklyTrend[weeklyTrend.length - 1].count >=
                      weeklyTrend[weeklyTrend.length - 2].count
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {weeklyTrend[weeklyTrend.length - 1].count >=
                    weeklyTrend[weeklyTrend.length - 2].count ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('feedback.allTime')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* NPS Trend Chart */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t('feedback.npsTrendOverTime')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                {t('feedback.noTrendData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={weeklyTrend}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                  />
                  <XAxis
                    dataKey="week"
                    tickFormatter={formatWeek}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[-100, 100]}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Tooltip content={<NpsTrendTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="nps"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 6 }}
                    name="NPS"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Response Volume Chart */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t('feedback.responseVolumeBySentiment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {volumeBySentiment.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                {t('feedback.noVolumeData')}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={volumeBySentiment}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                      width={30}
                      allowDecimals={false}
                    />
                    <Tooltip content={<VolumeTooltip />} />
                    <Bar
                      dataKey="promoter"
                      name={t('feedback.promoters')}
                      stackId="sentiment"
                      fill={COLORS.promoter}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="passive"
                      name={t('feedback.passives')}
                      stackId="sentiment"
                      fill={COLORS.passive}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="detractor"
                      name={t('feedback.detractors')}
                      stackId="sentiment"
                      fill={COLORS.detractor}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS.promoter }}
                    />
                    <span className="text-muted-foreground">{t('feedback.promoters')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS.passive }}
                    />
                    <span className="text-muted-foreground">{t('feedback.passives')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS.detractor }}
                    />
                    <span className="text-muted-foreground">{t('feedback.detractors')}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom Row: At-Risk Clients + Category Breakdown */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* At-Risk Clients */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-base font-semibold">
                {t('feedback.atRiskClients')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atRiskClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mb-2 opacity-40" />
                  <p>{t('feedback.noAtRiskClients')}</p>
                  <p className="text-xs mt-1">
                    {t('feedback.atRiskHint')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.email')}</TableHead>
                      <TableHead className="w-16 text-center">{t('feedback.score')}</TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t('feedback.followUp')}
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        {t('feedback.date')}
                      </TableHead>
                      <TableHead className="w-16 text-center">{t('feedback.flag')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {atRiskClients.slice(0, 10).map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="max-w-[160px] truncate text-sm">
                          {client.respondent_email ?? t('feedback.anonymous')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="tabular-nums">
                            {client.nps_score}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm text-muted-foreground">
                          {client.follow_up ?? "--"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(client.created_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={client.flagged ? "default" : "ghost"}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              handleToggleFlag(client.id, client.flagged)
                            }
                            title={
                              client.flagged ? t('feedback.removeFlag') : t('feedback.flagForFollowUp')
                            }
                          >
                            <Flag
                              className={`h-3.5 w-3.5 ${
                                client.flagged
                                  ? "text-white"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <BarChart2 className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base font-semibold">
                {t('feedback.npsByCategory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  <BarChart2 className="h-8 w-8 mb-2 opacity-40" />
                  <p>{t('feedback.noCategoryData')}</p>
                  <p className="text-xs mt-1">
                    {t('feedback.categoryDataHint')}
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, categoryBreakdown.length * 48)}>
                  <BarChart
                    data={categoryBreakdown}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={[-100, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                      width={100}
                    />
                    <ReferenceLine
                      x={0}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                    <Tooltip content={<CategoryTooltip />} />
                    <Bar
                      dataKey="nps"
                      name="NPS"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={28}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell
                          key={`cat-${index}`}
                          fill={
                            entry.nps < 0
                              ? COLORS.detractor
                              : entry.nps <= 50
                                ? COLORS.passive
                                : COLORS.promoter
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
