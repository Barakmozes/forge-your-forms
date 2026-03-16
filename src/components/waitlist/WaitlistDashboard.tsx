import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useWaitlistAnalytics } from "@/hooks/useWaitlistAnalytics";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  Calendar,
  Share2,
  ExternalLink,
  Copy,
  List,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useMemo } from "react";
import AiSummaryWidget from "@/components/ai/AiSummaryWidget";
import type { AiSubmissionInput } from "@/lib/ai";

interface WaitlistDashboardProps {
  formId: string;
  formTitle: string;
  formStatus: string;
}

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

export default function WaitlistDashboard({
  formId,
  formTitle,
  formStatus,
}: WaitlistDashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { stats, dailySignups, leaderboard, sourceBreakdown, loading, entries } =
    useWaitlistAnalytics(formId);
  const [copiedLink, setCopiedLink] = useState(false);

  const publicLink = `${window.location.origin}/f/${formId}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopiedLink(true);
      toast.success(t('waitlist.linkCopied'));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error(t('waitlist.failedCopy'));
    }
  }

  const pieData = [
    { name: t('waitlist.direct'), value: sourceBreakdown.direct },
    { name: t('waitlist.referral'), value: sourceBreakdown.referral },
  ];

  const aiSubmissions: AiSubmissionInput[] = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        text_fields: {
          ...(e.email ? { email: e.email } : {}),
          ...(e.name ? { name: e.name } : {}),
          ...(e.referred_by ? { source: "referral" } : { source: "direct" }),
          ...(e.metadata && typeof e.metadata === "object" ? { metadata: JSON.stringify(e.metadata) } : {}),
        },
      })),
    [entries]
  );

  const statCards = [
    {
      title: t('waitlist.totalSignups'),
      value: stats.total.toLocaleString(),
      subtitle: t('waitlist.allTime'),
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: t('waitlist.today'),
      value: stats.today.toLocaleString(),
      subtitle: t('waitlist.newSignupsToday'),
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: t('waitlist.thisWeek'),
      value: stats.thisWeek.toLocaleString(),
      subtitle: t('waitlist.last7Days'),
      icon: Calendar,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: t('waitlist.referralRate'),
      value: `${stats.referralRate.toFixed(1)}%`,
      subtitle: t('waitlist.ofAllSignups'),
      icon: Share2,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant={formStatus === "published" ? "default" : "secondary"}>
            {formStatus}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/forms/${formId}/entries`)}
            title={t("tooltips.dashboards.viewEntries")}
          >
            <List className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4" />
            {t('waitlist.viewEntries')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink} title={t("tooltips.dashboards.copyLink")}>
            <Copy className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4" />
            {copiedLink ? t('waitlist.copied') : t('waitlist.copyPublicLink')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/forms/${formId}/edit`)}
            title={t("tooltips.dashboards.editSettings")}
          >
            <ExternalLink className="ltr:mr-1.5 rtl:ml-1.5 h-4 w-4" />
            {t('waitlist.editSettings')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`rounded-md p-2 ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Summary */}
      <AiSummaryWidget formId={formId} submissions={aiSubmissions} />

      {/* Growth Chart */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t('waitlist.signupGrowth')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailySignups.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                {t('waitlist.noSignupData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={dailySignups}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="cumulativeFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="dailyFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--muted-foreground))"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--muted-foreground))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
                          <p className="font-medium mb-1">
                            {formatDate(label as string)}
                          </p>
                          {payload.map((entry) => (
                            <p
                              key={entry.dataKey}
                              className="text-muted-foreground"
                            >
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.dataKey === "cumulative"
                                ? t('waitlist.total')
                                : t('waitlist.daily')}
                              :{" "}
                              <span className="font-medium text-foreground">
                                {(entry.value as number).toLocaleString()}
                              </span>
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#cumulativeFill)"
                    name={t('waitlist.total')}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="url(#dailyFill)"
                    name={t('waitlist.daily')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom Row: Leaderboard + Source Breakdown */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Referral Leaderboard */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {t('waitlist.referralLeaderboard')}
                <InfoTooltip contentKey="tooltips.dashboards.referralInfo" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  <Share2 className="h-8 w-8 mb-2 opacity-40" />
                  <p>{t('waitlist.noReferralsYet')}</p>
                  <p className="text-xs mt-1">
                    {t('waitlist.referralDataHint')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('common.email')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('common.name')}</TableHead>
                      <TableHead className="text-right">{t('waitlist.referrals')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry, index) => (
                      <TableRow key={entry.referral_code}>
                        <TableCell className="font-medium">
                          {index === 0 ? (
                            <span className="text-amber-500 font-bold">1</span>
                          ) : index === 1 ? (
                            <span className="text-gray-400 font-bold">2</span>
                          ) : index === 2 ? (
                            <span className="text-orange-600 dark:text-orange-400 font-bold">
                              3
                            </span>
                          ) : (
                            index + 1
                          )}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">
                          {entry.email}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {entry.name ?? "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="tabular-nums">
                            {entry.referral_count}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Source Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {t('waitlist.sourceBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sourceBreakdown.direct === 0 && sourceBreakdown.referral === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mb-2 opacity-40" />
                  <p>{t('waitlist.noSignupsYet')}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
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

                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[0] }}
                      />
                      <span className="text-muted-foreground">{t('waitlist.direct')}</span>
                      <span className="font-medium tabular-nums">
                        {sourceBreakdown.direct.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[1] }}
                      />
                      <span className="text-muted-foreground">{t('waitlist.referral')}</span>
                      <span className="font-medium tabular-nums">
                        {sourceBreakdown.referral.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
