import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type FeedbackResponse = Tables<"feedback_responses">;
type FeedbackAlert = Tables<"feedback_alerts">;

export const FEEDBACK_PAGE_SIZE = 50;

export function useFeedback(formId: string) {
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  // analyticsData: lightweight fetch of all responses (no custom_answers/submission_id)
  // used by useFeedbackAnalytics so NPS/trends reflect the full dataset, not just the current page.
  const [analyticsData, setAnalyticsData] = useState<FeedbackResponse[]>([]);
  const [alerts, setAlerts] = useState<FeedbackAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Ref tracks current page for use inside realtime callbacks (avoids stale closure)
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const fetchResponses = useCallback(async (pageNum: number) => {
    setLoading(true);
    const [{ data: resData, count }, { data: alertData }] = await Promise.all([
      supabase
        .from("feedback_responses")
        .select("*", { count: "exact" })
        .eq("form_id", formId)
        .order("created_at", { ascending: false })
        .range(pageNum * FEEDBACK_PAGE_SIZE, (pageNum + 1) * FEEDBACK_PAGE_SIZE - 1),
      supabase
        .from("feedback_alerts")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false }),
    ]);
    setResponses(resData ?? []);
    if (count !== null) setTotalCount(count);
    setAlerts(alertData ?? []);
    setLoading(false);
  }, [formId]);

  const fetchAnalyticsData = useCallback(async () => {
    const { data } = await supabase
      .from("feedback_responses")
      .select("id, nps_score, sentiment, category, created_at, flagged, respondent_email, follow_up")
      .eq("form_id", formId)
      .order("created_at", { ascending: false });
    setAnalyticsData((data as FeedbackResponse[]) ?? []);
  }, [formId]);

  // Reset to page 0 whenever formId changes
  useEffect(() => {
    setPage(0);
    setTotalCount(0);
  }, [formId]);

  // Fetch paginated responses + alerts on formId or page change
  useEffect(() => {
    fetchResponses(page);
  }, [formId, page, fetchResponses]);

  // Fetch lightweight analytics data for all responses (not paginated)
  // Called on mount and whenever formId changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [formId, fetchAnalyticsData]);

  // Keep fetchResponses and fetchAnalyticsData refs current for realtime callbacks
  const fetchResponsesRef = useRef(fetchResponses);
  useEffect(() => {
    fetchResponsesRef.current = fetchResponses;
  }, [fetchResponses]);

  const fetchAnalyticsDataRef = useRef(fetchAnalyticsData);
  useEffect(() => {
    fetchAnalyticsDataRef.current = fetchAnalyticsData;
  }, [fetchAnalyticsData]);

  // Realtime subscriptions — re-created only when formId changes
  useEffect(() => {
    const responsesChannel = supabase
      .channel(`feedback-${formId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feedback_responses", filter: `form_id=eq.${formId}` },
        () => {
          // Refetch current page — new entries belong on page 0 (desc order), so don't blindly prepend
          fetchResponsesRef.current(pageRef.current);
          // Also refresh analytics data so NPS/trends stay accurate
          fetchAnalyticsDataRef.current();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "feedback_responses", filter: `form_id=eq.${formId}` },
        (payload) => {
          const updated = payload.new as FeedbackResponse;
          setResponses((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r))
          );
          setAnalyticsData((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "feedback_responses", filter: `form_id=eq.${formId}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setResponses((prev) => prev.filter((r) => r.id !== deletedId));
          setAnalyticsData((prev) => prev.filter((r) => r.id !== deletedId));
          setTotalCount((prev) => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    // NOTE: score_drop and keyword alert types exist in the DB enum (feedback_alert_type) but are not
    // yet implemented. Currently only the 'detractor' alert type is created by the DB trigger in
    // 005_feedback_tables.sql. See HANDOFF.md for planned implementations.
    //
    // NOTE: Detractor notifications (notifications table) are only sent to the workspace owner.
    // Fixing this to also notify editors requires a migration-level change to the DB trigger. See HANDOFF.md.
    const alertsChannel = supabase
      .channel(`feedback-alerts-${formId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feedback_alerts", filter: `form_id=eq.${formId}` },
        (payload) => {
          setAlerts((prev) => [payload.new as FeedbackAlert, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "feedback_alerts", filter: `form_id=eq.${formId}` },
        (payload) => {
          setAlerts((prev) =>
            prev.map((a) => (a.id === payload.new.id ? (payload.new as FeedbackAlert) : a))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(responsesChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [formId]);

  const submitFeedback = async (data: {
    nps_score: number;
    respondent_email?: string;
    respondent_name?: string;
    follow_up?: string;
    category?: string;
    custom_answers?: Record<string, unknown>;
  }) => {
    const { data: result, error } = await supabase
      .from("feedback_responses")
      .insert({
        form_id: formId,
        nps_score: data.nps_score,
        respondent_email: data.respondent_email || null,
        respondent_name: data.respondent_name || null,
        follow_up: data.follow_up || null,
        category: data.category || null,
        custom_answers: data.custom_answers ?? {},
      })
      .select()
      .single();

    return { data: result, error };
  };

  const toggleFlag = async (responseId: string, flagged: boolean) => {
    const { error } = await supabase
      .from("feedback_responses")
      .update({ flagged })
      .eq("id", responseId);

    if (!error) {
      setResponses((prev) =>
        prev.map((r) => (r.id === responseId ? { ...r, flagged } : r))
      );
      // Keep analyticsData in sync so at-risk clients list updates correctly
      setAnalyticsData((prev) =>
        prev.map((r) => (r.id === responseId ? { ...r, flagged } : r))
      );
    }
    return { error };
  };

  const markAlertRead = async (alertId: string) => {
    const { error } = await supabase
      .from("feedback_alerts")
      .update({ read: true })
      .eq("id", alertId);

    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
      );
    }
    return { error };
  };

  const totalPages = Math.ceil(totalCount / FEEDBACK_PAGE_SIZE);

  return {
    responses,
    analyticsData,
    alerts,
    loading,
    submitFeedback,
    toggleFlag,
    markAlertRead,
    refetch: () => fetchResponses(page),
    page,
    setPage,
    totalCount,
    totalPages,
    PAGE_SIZE: FEEDBACK_PAGE_SIZE,
  };
}
