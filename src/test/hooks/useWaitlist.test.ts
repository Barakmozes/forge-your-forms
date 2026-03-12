import { renderHook, act, waitFor } from "@testing-library/react";

const { mockFrom, mockSelect, mockEq, mockOrder, mockMaybeSingle, mockInsert, mockUpdate, mockDelete, mockChannel } = vi.hoisted(() => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
  const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }));

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    eq: mockEq,
    in: vi.fn().mockReturnThis(),
    order: mockOrder,
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));

  // Make chainable: select -> eq -> order, insert -> select -> single
  mockSelect.mockReturnValue({
    eq: mockEq,
    order: mockOrder,
  });
  mockEq.mockReturnValue({
    eq: mockEq,
    order: mockOrder,
    maybeSingle: mockMaybeSingle,
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockInsert.mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: "new-entry", email: "new@test.com", referral_code: "ABC123", position: 1 }, error: null }),
    }),
  });

  return { mockFrom, mockSelect, mockEq, mockOrder, mockMaybeSingle, mockInsert, mockUpdate, mockDelete, mockChannel };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/lib/referralCode", () => ({
  generateReferralCode: () => "TESTCODE",
}));

import { useWaitlist } from "@/hooks/useWaitlist";

describe("useWaitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], count: 0, error: null });
  });

  it("fetches entries ordered by position", async () => {
    const entries = [
      { id: "e1", email: "first@test.com", position: 1, status: "waiting" },
      { id: "e2", email: "second@test.com", position: 2, status: "waiting" },
    ];
    mockOrder.mockResolvedValue({ data: entries, count: 2, error: null });

    const { result } = renderHook(() => useWaitlist("form-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
  });

  it("starts with loading state", () => {
    mockOrder.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWaitlist("form-1"));

    expect(result.current.loading).toBe(true);
  });

  it("provides CRUD methods", async () => {
    const { result } = renderHook(() => useWaitlist("form-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.addEntry).toBe("function");
    expect(typeof result.current.updateEntryStatus).toBe("function");
    expect(typeof result.current.bulkInvite).toBe("function");
    expect(typeof result.current.deleteEntry).toBe("function");
    expect(typeof result.current.exportCSV).toBe("function");
  });

  it("provides refetch function", async () => {
    const { result } = renderHook(() => useWaitlist("form-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
  });

  it("sets up realtime subscription", () => {
    renderHook(() => useWaitlist("form-1"));

    expect(mockChannel).toHaveBeenCalledWith("waitlist-form-1");
  });
});
