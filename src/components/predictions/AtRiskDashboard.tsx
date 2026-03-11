// ============================================
// AtRiskDashboard — Churn prediction dashboard (Agent 13)
// Full-page view of at-risk customers.
// ============================================

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useAtRiskCustomers,
  useCalculateChurnScores,
  getRiskLevel,
  type RiskLevel,
} from "@/hooks/useChurnPrediction";
import FeatureGate from "@/components/upgrade/FeatureGate";
import AppLayout from "@/components/AppLayout";
import ChurnScoreBadge from "@/components/predictions/ChurnScoreBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  RefreshCw,
  Users,
  TrendingUp,
  Shield,
  Mail,
  Clock,
  Ticket,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AtRiskDashboard() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const workspaceId = currentWorkspace?.id ?? "";

  const { customers, loading, refetch } = useAtRiskCustomers(workspaceId);
  const { calculate, calculating } = useCalculateChurnScores(workspaceId);

  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    if (riskFilter === "all") return customers;
    return customers.filter((c) => getRiskLevel(c.risk_score) === riskFilter);
  }, [customers, riskFilter]);

  const summary = useMemo(() => {
    const critical = customers.filter((c) => c.risk_score > 80).length;
    const high = customers.filter((c) => c.risk_score > 60 && c.risk_score <= 80).length;
    const medium = customers.filter((c) => c.risk_score > 40 && c.risk_score <= 60).length;
    const low = customers.filter((c) => c.risk_score <= 40).length;
    return { critical, high, medium, low, total: customers.length };
  }, [customers]);

  const handleRecalculate = async () => {
    await calculate();
    await refetch();
    toast({
      title: t("predictions.scoresUpdated", "Scores Updated"),
      description: t("predictions.recalculationComplete", "Churn scores have been recalculated."),
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <AppLayout>
      <FeatureGate feature="churn_prediction" requiredPlan="business" featureName="Churn Prediction">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                {t("predictions.atRiskCustomers", "At-Risk Customers")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {t("predictions.atRiskDescription", "Customers with high churn risk based on NPS, ticket frequency, and engagement.")}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRecalculate}
              disabled={calculating}
              className="gap-2"
            >
              {calculating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t("predictions.recalculate", "Recalculate Scores")}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">
                    {t("predictions.critical", "Critical")}
                  </span>
                </div>
                <p className="text-2xl font-bold">{summary.critical}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-sm text-muted-foreground">
                    {t("predictions.high", "High")}
                  </span>
                </div>
                <p className="text-2xl font-bold">{summary.high}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-sm text-muted-foreground">
                    {t("predictions.medium", "Medium")}
                  </span>
                </div>
                <p className="text-2xl font-bold">{summary.medium}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">
                    {t("predictions.low", "Low")}
                  </span>
                </div>
                <p className="text-2xl font-bold">{summary.low}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3">
            <Select
              value={riskFilter}
              onValueChange={(v) => setRiskFilter(v as RiskLevel | "all")}
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder={t("predictions.allLevels", "All Levels")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("predictions.allLevels", "All Levels")}</SelectItem>
                <SelectItem value="critical">{t("predictions.critical", "Critical")} (&gt;80)</SelectItem>
                <SelectItem value="high">{t("predictions.high", "High")} (60–80)</SelectItem>
                <SelectItem value="medium">{t("predictions.medium", "Medium")} (40–60)</SelectItem>
                <SelectItem value="low">{t("predictions.low", "Low")} (&lt;40)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredCustomers.length} {t("predictions.customers", "customers")}
            </span>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {t("common.loading", "Loading...")}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Shield className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">
                    {customers.length === 0
                      ? t("predictions.noScoresYet", "No churn scores calculated yet")
                      : t("predictions.noCustomersInFilter", "No customers match this filter")}
                  </p>
                  {customers.length === 0 && (
                    <p className="text-xs mt-1">
                      {t("predictions.clickRecalculate", "Click 'Recalculate Scores' to analyze your customers.")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("predictions.customer", "Customer")}</TableHead>
                        <TableHead className="w-32">{t("predictions.riskScore", "Risk Score")}</TableHead>
                        <TableHead className="w-24 hidden sm:table-cell">{t("predictions.nps", "NPS Avg")}</TableHead>
                        <TableHead className="w-24 hidden md:table-cell">{t("predictions.tickets30d", "Tickets (30d)")}</TableHead>
                        <TableHead className="w-28 hidden md:table-cell">{t("predictions.sentiment", "Sentiment")}</TableHead>
                        <TableHead className="w-32 hidden lg:table-cell">{t("predictions.lastInteraction", "Last Interaction")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow
                          key={customer.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setExpandedEmail(
                              expandedEmail === customer.customer_email
                                ? null
                                : customer.customer_email
                            )
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate max-w-[200px]">
                                {customer.customer_email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ChurnScoreBadge score={customer.risk_score} />
                              <Progress
                                value={customer.risk_score}
                                className="h-1.5 w-16"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-sm tabular-nums">
                              {customer.nps_average !== null
                                ? customer.nps_average.toFixed(1)
                                : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm tabular-nums">
                              {customer.ticket_count_30d}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {customer.sentiment_trend ? (
                              <Badge
                                variant="secondary"
                                className={
                                  customer.sentiment_trend === "negative"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : customer.sentiment_trend === "positive"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : ""
                                }
                              >
                                {customer.sentiment_trend}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {formatDate(customer.last_interaction_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expanded Detail */}
          {expandedEmail && (() => {
            const customer = customers.find(
              (c) => c.customer_email === expandedEmail
            );
            if (!customer) return null;
            const factors = customer.risk_factors;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {customer.customer_email}
                    <ChurnScoreBadge score={customer.risk_score} showLabel size="md" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("predictions.npsAverage", "NPS Average")}
                        </p>
                        <p className="text-lg font-bold tabular-nums">
                          {factors.nps_average !== null ? factors.nps_average.toFixed(1) : "N/A"}
                        </p>
                        {factors.nps_flag && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {factors.nps_flag}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Ticket className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("predictions.tickets30d", "Tickets (30d)")}
                        </p>
                        <p className="text-lg font-bold tabular-nums">
                          {factors.ticket_count_30d}
                        </p>
                        {factors.ticket_flag && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {factors.ticket_flag}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("predictions.sentimentTrend", "Sentiment Trend")}
                        </p>
                        <p className="text-lg font-bold capitalize">
                          {factors.sentiment_trend ?? "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("predictions.daysSinceContact", "Days Since Contact")}
                        </p>
                        <p className="text-lg font-bold tabular-nums">
                          {factors.days_since_interaction ?? "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </FeatureGate>
    </AppLayout>
  );
}
