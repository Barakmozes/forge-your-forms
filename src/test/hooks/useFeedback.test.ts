import { renderHook, waitFor } from "@testing-library/react";

const { mockChannel, mockOrder } = vi.hoisted(() => {
  const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }));
  return { mockChannel, mockOrder };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: mockOrder,
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "resp-1", nps_score: 9, sentiment: "promoter" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
    channel: mockChannel,
    removeChannel: vi.fn(),
  },
}));

import { useFeedback } from "@/hooks/useFeedback";

describe("useFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
  });

  it("fetches responses and alerts on mount", async () => {
    const responses = [
      { id: "r1", nps_score: 10, sentiment: "promoter", form_id: "f1" },
      { id: "r2", nps_score: 3, sentiment: "detractor", form_id: "f1" },
    ];
    // First call for responses, second for alerts
    mockOrder
      .mockResolvedValueOnce({ data: responses, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => useFeedback("f1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.responses).toHaveLength(2);
  });

  it("starts with loading state", () => {
    mockOrder.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFeedback("f1"));

    expect(result.current.loading).toBe(true);
  });

  it("provides CRUD methods", async () => {
    const { result } = renderHook(() => useFeedback("f1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.submitFeedback).toBe("function");
    expect(typeof result.current.toggleFlag).toBe("function");
    expect(typeof result.current.markAlertRead).toBe("function");
    expect(typeof result.current.refetch).toBe("function");
  });

  it("sets up realtime subscription", () => {
    renderHook(() => useFeedback("f1"));

    expect(mockChannel).toHaveBeenCalledWith("feedback-f1");
  });

  it("returns alerts array", async () => {
    mockOrder
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: "a1", alert_type: "detractor" }], error: null });

    const { result } = renderHook(() => useFeedback("f1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alerts).toHaveLength(1);
  });
});
