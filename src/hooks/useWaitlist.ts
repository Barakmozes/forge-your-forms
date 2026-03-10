import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type WaitlistEntry = Tables<"waitlist_entries">;

export function useWaitlist(formId: string) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from("waitlist_entries")
      .select("*", { count: "exact" })
      .eq("form_id", formId)
      .order("position", { ascending: true });

    setEntries(data ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [formId]);

  useEffect(() => {
    fetchEntries();

    // Real-time subscription
    const channel = supabase
      .channel(`waitlist-${formId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waitlist_entries", filter: `form_id=eq.${formId}` },
        (payload) => {
          const newEntry = payload.new as WaitlistEntry;
          setEntries((prev) => [...prev, newEntry]);
          setTotalCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formId, fetchEntries]);

  const addEntry = async (email: string, name?: string, referredBy?: string) => {
    // Check for duplicate
    const { data: existing } = await supabase
      .from("waitlist_entries")
      .select("id, position, referral_code")
      .eq("form_id", formId)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return { entry: existing as WaitlistEntry, duplicate: true, error: null };
    }

    const { generateReferralCode } = await import("@/lib/referralCode");
    const referral_code = generateReferralCode();

    const { data, error } = await supabase
      .from("waitlist_entries")
      .insert({
        form_id: formId,
        email,
        name: name || null,
        referral_code,
        referred_by: referredBy || null,
      } satisfies TablesInsert<"waitlist_entries">)
      .select()
      .single();

    return { entry: data as WaitlistEntry | null, duplicate: false, error };
  };

  const updateEntryStatus = async (entryId: string, status: WaitlistEntry["status"]) => {
    const { error } = await supabase
      .from("waitlist_entries")
      .update({ status })
      .eq("id", entryId);

    if (!error) {
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status } : e))
      );
    }
    return { error };
  };

  const bulkInvite = async (entryIds: string[], message?: string) => {
    // Update status to invited
    const { error: updateError } = await supabase
      .from("waitlist_entries")
      .update({ status: "invited" as const })
      .in("id", entryIds);

    if (updateError) return { error: updateError };

    // Create invite records
    const invites = entryIds.map((entry_id) => ({
      form_id: formId,
      entry_id,
      message: message || null,
    }));

    const { error: insertError } = await supabase
      .from("waitlist_invites")
      .insert(invites);

    if (!insertError) {
      setEntries((prev) =>
        prev.map((e) =>
          entryIds.includes(e.id) ? { ...e, status: "invited" as const } : e
        )
      );
    }

    return { error: insertError };
  };

  const deleteEntry = async (entryId: string) => {
    const { error } = await supabase
      .from("waitlist_entries")
      .delete()
      .eq("id", entryId);

    if (!error) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      setTotalCount((prev) => prev - 1);
    }
    return { error };
  };

  const exportCSV = () => {
    const headers = ["Position", "Email", "Name", "Referral Code", "Referral Count", "Status", "Joined"];
    const rows = entries.map((e) => [
      e.position,
      e.email,
      e.name ?? "",
      e.referral_code,
      e.referral_count,
      e.status,
      new Date(e.created_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${formId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    entries,
    loading,
    totalCount,
    addEntry,
    updateEntryStatus,
    bulkInvite,
    deleteEntry,
    exportCSV,
    refetch: fetchEntries,
  };
}
