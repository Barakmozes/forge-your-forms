import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type WaitlistEntry = Tables<"waitlist_entries">;

const PAGE_SIZE = 50;

/** Sanitize a CSV cell value to prevent formula injection in Excel/Sheets. */
function sanitizeCSVValue(value: string): string {
  let sanitized = String(value);
  // Prefix values starting with formula characters to prevent execution
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = "'" + sanitized;
  }
  // Escape internal double quotes and wrap the whole value in double quotes
  sanitized = sanitized.replace(/"/g, '""');
  return `"${sanitized}"`;
}

export function useWaitlist(formId: string) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from("waitlist_entries")
      .select("*", { count: "exact" })
      .eq("form_id", formId)
      .order("position", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setEntries(data ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [formId, page]);

  // Keep a stable ref so the realtime subscription always calls the latest fetchEntries
  const fetchEntriesRef = useRef(fetchEntries);
  useEffect(() => {
    fetchEntriesRef.current = fetchEntries;
  }, [fetchEntries]);

  // Re-fetch when page or formId changes
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Realtime subscription — only recreated when formId changes (page-independent)
  useEffect(() => {
    const channel = supabase
      .channel(`waitlist-${formId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waitlist_entries", filter: `form_id=eq.${formId}` },
        () => { fetchEntriesRef.current(); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "waitlist_entries", filter: `form_id=eq.${formId}` },
        () => { fetchEntriesRef.current(); }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "waitlist_entries", filter: `form_id=eq.${formId}` },
        () => { fetchEntriesRef.current(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formId]);

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

  const exportCSV = (filteredEntries?: WaitlistEntry[]) => {
    const data = filteredEntries ?? entries;
    const headers = ["Position", "Email", "Name", "Referral Code", "Referral Count", "Status", "Joined"];
    const rows = data.map((e) => [
      String(e.position),
      e.email,
      e.name ?? "",
      e.referral_code,
      String(e.referral_count),
      e.status,
      new Date(e.created_at).toISOString(),
    ]);
    // UTF-8 BOM ensures correct encoding in Excel; sanitizeCSVValue prevents formula injection
    const headerRow = headers.map(sanitizeCSVValue).join(",");
    const dataRows = rows.map((r) => r.map(sanitizeCSVValue).join(","));
    const csv = "\uFEFF" + [headerRow, ...dataRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${formId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportEmailsOnly = (filteredEntries?: WaitlistEntry[]) => {
    const data = filteredEntries ?? entries;
    // sanitizeCSVValue wraps values in quotes and escapes formula-injection prefixes
    const emails = data.map((e) => sanitizeCSVValue(e.email)).join("\n");
    // UTF-8 BOM ensures correct encoding when opened in Excel
    const blob = new Blob(["\uFEFF" + emails], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-emails-${formId}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    entries,
    loading,
    totalCount,
    page,
    setPage,
    PAGE_SIZE,
    totalPages,
    addEntry,
    updateEntryStatus,
    bulkInvite,
    deleteEntry,
    exportCSV,
    exportEmailsOnly,
    refetch: fetchEntries,
  };
}
