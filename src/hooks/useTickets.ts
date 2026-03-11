import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

type Ticket = Tables<"tickets">;
type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

export function useTickets(formId: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("form_id", formId)
      .order("created_at", { ascending: false });

    const fetched = data ?? [];

    // Auto-close: resolved tickets older than 7 days → closed
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const toClose = fetched.filter(
      (t) =>
        t.status === "resolved" &&
        t.resolved_at &&
        new Date(t.resolved_at).getTime() < sevenDaysAgo
    );
    if (toClose.length > 0) {
      const ids = toClose.map((t) => t.id);
      await supabase.from("tickets").update({ status: "closed" }).in("id", ids);
      for (const t of fetched) {
        if (ids.includes(t.id)) t.status = "closed";
      }
    }

    setTickets(fetched);
    setLoading(false);
  }, [formId]);

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel(`tickets-${formId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `form_id=eq.${formId}` },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formId, fetchTickets]);

  const createTicket = async (data: {
    subject: string;
    description?: string;
    submitted_by_email?: string;
    submitted_by_name?: string;
    category?: string;
    priority?: TicketPriority;
  }) => {
    const { data: result, error } = await supabase
      .from("tickets")
      .insert({
        form_id: formId,
        ticket_number: "", // trigger will auto-generate
        subject: data.subject,
        description: data.description || null,
        submitted_by_email: data.submitted_by_email || null,
        submitted_by_name: data.submitted_by_name || null,
        category: data.category || null,
        priority: data.priority ?? "medium",
      })
      .select()
      .single();

    return { data: result, error };
  };

  const updateTicket = async (ticketId: string, updates: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigned_to?: string | null;
    category?: string | null;
  }) => {
    const { error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", ticketId);

    if (!error) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...updates } : t))
      );
    }
    return { error };
  };

  const bulkUpdateStatus = async (ticketIds: string[], status: TicketStatus) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status })
      .in("id", ticketIds);

    if (!error) {
      setTickets((prev) =>
        prev.map((t) =>
          ticketIds.includes(t.id) ? { ...t, status } : t
        )
      );
    }
    return { error };
  };

  const ticketsByStatus = (status: TicketStatus) =>
    tickets.filter((t) => t.status === status);

  return {
    tickets,
    loading,
    createTicket,
    updateTicket,
    bulkUpdateStatus,
    ticketsByStatus,
    refetch: fetchTickets,
  };
}
