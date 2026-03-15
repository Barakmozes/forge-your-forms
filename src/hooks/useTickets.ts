import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";
import { dispatchWorkflowTrigger } from "@/lib/workflowEngine";

type Ticket = Tables<"tickets">;
type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

// Page size for client-side pagination of the tickets table.
const PAGE_SIZE = 25;

// NOTE (P1 #39): generate_ticket_number() in the DB trigger uses MAX(ticket_number)
// without advisory locking. Concurrent inserts could theoretically produce duplicate
// numbers; the UNIQUE constraint catches duplicates but there is no retry logic.
// A proper fix requires either pg_advisory_lock or a dedicated sequence in a migration
// (Agent 02's domain).

export function useTickets(formId: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  // Ref prevents auto-close from firing DB writes on every refetch / realtime event.
  const autoCloseRanRef = useRef(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("form_id", formId)
      .order("created_at", { ascending: false });

    const fetched = data ?? [];

    // Auto-close: resolved tickets older than 7 days → closed.
    // Guard with ref so this only runs once per component mount, not on every realtime refetch.
    if (!autoCloseRanRef.current) {
      autoCloseRanRef.current = true;
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
      // Dispatch workflow trigger when ticket is resolved
      if (updates.status === "resolved") {
        const ticket = tickets.find((t) => t.id === ticketId);
        dispatchWorkflowTrigger(formId, "ticket_resolved", {
          ticketId,
          ticket_number: ticket?.ticket_number,
          subject: ticket?.subject,
          email: ticket?.submitted_by_email,
          name: ticket?.submitted_by_name,
          category: ticket?.category,
          priority: ticket?.priority,
          status: "resolved",
        }).catch(() => {});
      }
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
      // Dispatch workflow trigger for each resolved ticket
      if (status === "resolved") {
        for (const id of ticketIds) {
          const ticket = tickets.find((t) => t.id === id);
          dispatchWorkflowTrigger(formId, "ticket_resolved", {
            ticketId: id,
            ticket_number: ticket?.ticket_number,
            subject: ticket?.subject,
            email: ticket?.submitted_by_email,
            name: ticket?.submitted_by_name,
            category: ticket?.category,
            priority: ticket?.priority,
            status: "resolved",
          }).catch(() => {});
        }
      }
    }
    return { error };
  };

  const ticketsByStatus = (status: TicketStatus) =>
    tickets.filter((t) => t.status === status);

  const totalPages = Math.ceil(tickets.length / PAGE_SIZE);
  // paginatedTickets is a convenience slice of the full list.
  // SupportDashboard applies its own filters before paginating, so it computes
  // its own paginatedFilteredTickets from filteredTickets instead.
  const paginatedTickets = tickets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return {
    tickets,
    paginatedTickets,
    page,
    setPage,
    PAGE_SIZE,
    totalPages,
    loading,
    createTicket,
    updateTicket,
    bulkUpdateStatus,
    ticketsByStatus,
    refetch: fetchTickets,
  };
}
