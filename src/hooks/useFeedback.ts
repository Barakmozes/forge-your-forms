import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type FeedbackResponse = Tables<"feedback_responses">;
type FeedbackAlert = Tables<"feedback_alerts">;

export function useFeedback(formId: string) {
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [alerts, setAlerts] = useState<FeedbackAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    const [{ data: resData }, { data: alertData }] = await Promise.all([
      supabase
        .from("feedback_responses")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false }),
      supabase
        .from("feedback_alerts")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false }),
    ]);
    setResponses(resData ?? []);
    setAlerts(alertData ?? []);
    setLoading(false);
  }, [formId]);

  useEffect(() => {
    fetchResponses();

    const channel = supabase
      .channel(`feedback-${formId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feedback_responses", filter: `form_id=eq.${formId}` },
        (payload) => {
          const newResponse = payload.new as FeedbackResponse;
          setResponses((prev) => {
            if (prev.some((r) => r.id === newResponse.id)) return prev;
            return [newResponse, ...prev];
          });
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
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "feedback_responses", filter: `form_id=eq.${formId}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setResponses((prev) => prev.filter((r) => r.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formId, fetchResponses]);

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

  return {
    responses,
    alerts,
    loading,
    submitFeedback,
    toggleFlag,
    markAlertRead,
    refetch: fetchResponses,
  };
}
