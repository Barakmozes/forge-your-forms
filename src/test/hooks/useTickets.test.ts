import { renderHook, waitFor } from "@testing-library/react";
import { createMockTicket } from "@/test/utils";

const { mockChannel, mockOrder, mockUpdate, mockInsert } = vi.hoisted(() => {
  const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
    in: vi.fn().mockResolvedValue({ error: null }),
  });
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "t1", ticket_number: "TICK-001", subject: "New ticket" },
        error: null,
      }),
    }),
  });
  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }));
  return { mockChannel, mockOrder, mockUpdate, mockInsert };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: mockOrder,
      insert: mockInsert,
      update: mockUpdate,
    })),
    channel: mockChannel,
    removeChannel: vi.fn(),
  },
}));

import { useTickets } from "@/hooks/useTickets";

describe("useTickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
  });

  it("fetches tickets on mount", async () => {
    const tickets = [
      createMockTicket("f1", { id: "t1", ticket_number: "TICK-001", subject: "First" }),
      createMockTicket("f1", { id: "t2", ticket_number: "TICK-002", subject: "Second" }),
    ];
    mockOrder.mockResolvedValue({ data: tickets, error: null });

    const { result } = renderHook(() => useTickets("f1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tickets).toHaveLength(2);
  });

  it("starts with loading state", () => {
    mockOrder.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTickets("f1"));

    expect(result.current.loading).toBe(true);
  });

  it("provides CRUD methods", async () => {
    const { result } = renderHook(() => useTickets("f1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.createTicket).toBe("function");
    expect(typeof result.current.updateTicket).toBe("function");
    expect(typeof result.current.bulkUpdateStatus).toBe("function");
    expect(typeof result.current.ticketsByStatus).toBe("function");
    expect(typeof result.current.refetch).toBe("function");
  });

  it("provides ticketsByStatus filter", async () => {
    const tickets = [
      createMockTicket("f1", { id: "t1", status: "open" }),
      createMockTicket("f1", { id: "t2", status: "resolved" }),
      createMockTicket("f1", { id: "t3", status: "open" }),
    ];
    mockOrder.mockResolvedValue({ data: tickets, error: null });

    const { result } = renderHook(() => useTickets("f1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const openTickets = result.current.ticketsByStatus("open");
    expect(openTickets).toHaveLength(2);

    const resolvedTickets = result.current.ticketsByStatus("resolved");
    expect(resolvedTickets).toHaveLength(1);
  });

  it("sets up realtime subscription", () => {
    renderHook(() => useTickets("f1"));

    expect(mockChannel).toHaveBeenCalledWith("tickets-f1");
  });
});
