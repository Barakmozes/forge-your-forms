import { useMemo } from "react";
import type { Tables, Database } from "@/integrations/supabase/types";

type Ticket = Tables<"tickets">;
type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export function useSupportAnalytics(tickets: Ticket[]) {
  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "open").length;
    const inProgress = tickets.filter((t) => t.status === "in_progress").length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    const unassigned = tickets.filter(
      (t) => !t.assigned_to && t.status !== "resolved" && t.status !== "closed"
    ).length;

    // Resolved today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const resolvedToday = tickets.filter(
      (t) => t.resolved_at && new Date(t.resolved_at) >= todayStart
    ).length;

    // Average resolution time (in hours) for resolved tickets
    const resolvedTickets = tickets.filter((t) => t.resolved_at);
    let avgResolutionHours = 0;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const resolvedAt = new Date(t.resolved_at!).getTime();
        return sum + (resolvedAt - created) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedTickets.length);
    }

    // Average first response time (in hours)
    const respondedTickets = tickets.filter((t) => t.first_response_at);
    let avgFirstResponseHours = 0;
    if (respondedTickets.length > 0) {
      const totalHours = respondedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const responded = new Date(t.first_response_at!).getTime();
        return sum + (responded - created) / (1000 * 60 * 60);
      }, 0);
      avgFirstResponseHours = Math.round(totalHours / respondedTickets.length);
    }

    return {
      total: tickets.length,
      open,
      inProgress,
      resolved,
      unassigned,
      resolvedToday,
      avgResolutionHours,
      avgFirstResponseHours,
    };
  }, [tickets]);

  const volumeByDay = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const t of tickets) {
      const date = new Date(t.created_at).toISOString().split("T")[0];
      dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
    }
    return [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }, [tickets]);

  const priorityBreakdown = useMemo(() => {
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const t of tickets) {
      counts[t.priority] = (counts[t.priority] ?? 0) + 1;
    }
    return Object.entries(counts).map(([priority, count]) => ({ priority, count }));
  }, [tickets]);

  const agentWorkload = useMemo(() => {
    const workload = new Map<string, number>();
    for (const t of tickets) {
      if (t.assigned_to && (t.status === "open" || t.status === "in_progress")) {
        workload.set(t.assigned_to, (workload.get(t.assigned_to) ?? 0) + 1);
      }
    }
    return [...workload.entries()].map(([agent, count]) => ({ agent, count }));
  }, [tickets]);

  const categoryBreakdown = useMemo(() => {
    const cats = new Map<string, number>();
    for (const t of tickets) {
      const cat = t.category ?? "Uncategorized";
      cats.set(cat, (cats.get(cat) ?? 0) + 1);
    }
    return [...cats.entries()].map(([category, count]) => ({ category, count }));
  }, [tickets]);

  const slaBreaches = useMemo(() => {
    // Tickets open for more than 24 hours with no first response
    const now = Date.now();
    return tickets.filter((t) => {
      if (t.status === "resolved" || t.status === "closed") return false;
      if (t.first_response_at) return false;
      const age = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
      return age > 24;
    });
  }, [tickets]);

  // Resolution metrics trend — resolved count per day for last 30 days
  const resolutionTrend = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const t of tickets) {
      if (!t.resolved_at) continue;
      const date = new Date(t.resolved_at).toISOString().split("T")[0];
      dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
    }
    return [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));
  }, [tickets]);

  return {
    stats,
    volumeByDay,
    priorityBreakdown,
    agentWorkload,
    categoryBreakdown,
    slaBreaches,
    resolutionTrend,
  };
}
