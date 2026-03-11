-- 011_auto_close_tickets.sql
-- NOTE: Auto-close of resolved tickets is handled client-side.
-- Tickets resolved for 7+ days are automatically closed on dashboard load.
-- This migration adds an index to optimize that query.

-- Index for finding resolved tickets by resolved_at date
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at
  ON public.tickets (status, resolved_at)
  WHERE status = 'resolved' AND resolved_at IS NOT NULL;

-- Index for agent assignment lookups
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to
  ON public.tickets (assigned_to)
  WHERE assigned_to IS NOT NULL;
