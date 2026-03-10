-- ============================================
-- Migration 006: Support/Tickets Tables
-- ============================================

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status public.ticket_status DEFAULT 'open' NOT NULL,
  priority public.ticket_priority DEFAULT 'medium' NOT NULL,
  category TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_email TEXT,
  submitted_by_name TEXT,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(form_id, ticket_number)
);

-- Ticket Messages (thread)
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_type public.ticket_sender_type NOT NULL DEFAULT 'customer',
  sender_name TEXT,
  sender_email TEXT,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Canned Responses
CREATE TABLE public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1' NOT NULL,
  UNIQUE(workspace_id, name)
);

-- Ticket Tags (junction)
CREATE TABLE public.ticket_tags (
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

-- Indexes
CREATE INDEX idx_tickets_form ON public.tickets(form_id);
CREATE INDEX idx_tickets_status ON public.tickets(form_id, status);
CREATE INDEX idx_tickets_assigned ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_number ON public.tickets(ticket_number);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX idx_canned_responses_workspace ON public.canned_responses(workspace_id);
CREATE INDEX idx_tags_workspace ON public.tags(workspace_id);

-- RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;

-- Tickets: workspace members read all; anon insert for active support forms
CREATE POLICY "tickets_select_member" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- Customers can read their own ticket by email
CREATE POLICY "tickets_select_customer" ON public.tickets
  FOR SELECT USING (true);

CREATE POLICY "tickets_insert_public" ON public.tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND f.status = 'active' AND f.mode = 'support'
    )
  );

CREATE POLICY "tickets_update_member" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- Messages: workspace members read all; customers can add messages to their tickets
CREATE POLICY "messages_select_member" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.forms f ON f.id = t.form_id
      WHERE t.id = ticket_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

CREATE POLICY "messages_select_customer" ON public.ticket_messages
  FOR SELECT USING (
    NOT is_internal AND EXISTS (
      SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
    )
  );

CREATE POLICY "messages_insert_public" ON public.ticket_messages
  FOR INSERT WITH CHECK (true);

-- Canned Responses: workspace members
CREATE POLICY "canned_select_member" ON public.canned_responses
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "canned_insert_member" ON public.canned_responses
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "canned_update_member" ON public.canned_responses
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "canned_delete_member" ON public.canned_responses
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Tags: workspace members
CREATE POLICY "tags_select_member" ON public.tags
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "tags_insert_member" ON public.tags
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "tags_update_member" ON public.tags
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "tags_delete_member" ON public.tags
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Ticket Tags: workspace members
CREATE POLICY "ticket_tags_select_member" ON public.ticket_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.forms f ON f.id = t.form_id
      WHERE t.id = ticket_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );
CREATE POLICY "ticket_tags_insert_member" ON public.ticket_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.forms f ON f.id = t.form_id
      WHERE t.id = ticket_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );
CREATE POLICY "ticket_tags_delete_member" ON public.ticket_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.forms f ON f.id = t.form_id
      WHERE t.id = ticket_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
    )
  );

-- Function: generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number(p_form_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN ticket_number ~ '^TICK-[0-9]+$'
    THEN CAST(SUBSTRING(ticket_number FROM 6) AS INTEGER)
    ELSE 0 END
  ), 0) + 1
  INTO next_num
  FROM public.tickets
  WHERE form_id = p_form_id;

  RETURN 'TICK-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- Trigger: auto-set ticket_number on insert
CREATE OR REPLACE FUNCTION public.handle_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number(NEW.form_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_created_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ticket_number();

-- Trigger: set resolved_at when status changes to resolved
CREATE OR REPLACE FUNCTION public.handle_ticket_resolved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
    NEW.resolved_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_resolved
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ticket_resolved();

-- Trigger: set first_response_at on first agent message
CREATE OR REPLACE FUNCTION public.handle_first_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'agent' THEN
    UPDATE public.tickets
    SET first_response_at = COALESCE(first_response_at, now())
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_message_created
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_response();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
