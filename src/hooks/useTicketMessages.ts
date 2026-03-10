import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

type TicketMessage = Tables<"ticket_messages">;
type SenderType = Database["public"]["Enums"]["ticket_sender_type"];

export function useTicketMessages(ticketId: string) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    setMessages(data ?? []);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TicketMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, fetchMessages]);

  const addMessage = async (data: {
    message: string;
    sender_type: SenderType;
    sender_name?: string;
    sender_email?: string;
    is_internal?: boolean;
  }) => {
    const { data: result, error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        message: data.message,
        sender_type: data.sender_type,
        sender_name: data.sender_name || null,
        sender_email: data.sender_email || null,
        is_internal: data.is_internal ?? false,
      })
      .select()
      .single();

    return { data: result, error };
  };

  return { messages, loading, addMessage, refetch: fetchMessages };
}
