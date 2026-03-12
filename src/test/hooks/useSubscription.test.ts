import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockMaybeSingle, mockChannel } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockChannel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    })),
    channel: mockChannel,
    removeChannel: vi.fn(),
  },
}));

// Mock workspace context
const mockWorkspaceId = { current: "ws-1" };
vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: mockWorkspaceId.current ? { id: mockWorkspaceId.current } : null,
  }),
}));

import { useSubscription } from "@/hooks/useSubscription";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceId.current = "ws-1";
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("returns Free plan when no subscription exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useSubscription(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.plan).toBe("free");
    expect(result.current.isFree).toBe(true);
    expect(result.current.isPro).toBe(false);
    expect(result.current.isGrowth).toBe(false);
    expect(result.current.isBusiness).toBe(false);
  });

  it("returns correct plan for active subscription", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { plan: "pro", status: "active", workspace_id: "ws-1" },
      error: null,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.plan).toBe("pro");
    expect(result.current.isPro).toBe(true);
    expect(result.current.isFree).toBe(false);
  });

  it("isPro/isGrowth/isBusiness return correct booleans", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { plan: "growth", status: "active" },
      error: null,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isGrowth).toBe(true);
    expect(result.current.isPro).toBe(false);
    expect(result.current.isBusiness).toBe(false);
    expect(result.current.isFree).toBe(false);
  });

  it("handles canceled subscription (reverts to Free)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { plan: "pro", status: "canceled" },
      error: null,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.plan).toBe("free");
    expect(result.current.isFree).toBe(true);
  });

  it("handles past_due subscription status", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { plan: "growth", status: "past_due" },
      error: null,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.plan).toBe("free");
  });

  it("canAccess checks feature availability", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { plan: "pro", status: "active" },
      error: null,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canAccess("waitlist_mode")).toBe(true);
    expect(result.current.canAccess("sso")).toBe(false);
  });

  it("subscribes to realtime changes", () => {
    renderHook(() => useSubscription(), { wrapper: createWrapper() });

    expect(mockChannel).toHaveBeenCalledWith("subscription-ws-1");
  });
});
