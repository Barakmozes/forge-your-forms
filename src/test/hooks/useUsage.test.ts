import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: "ws-1" },
  }),
}));

import { useUsage } from "@/hooks/useUsage";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: { submission_count: 0, form_count: 0, member_count: 0 },
      error: null,
    });
  });

  it("returns correct monthly usage counters", async () => {
    mockRpc.mockResolvedValue({
      data: { submission_count: 42, form_count: 3, member_count: 2 },
      error: null,
    });

    const { result } = renderHook(() => useUsage(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.submissionCount).toBe(42);
    expect(result.current.formCount).toBe(3);
    expect(result.current.memberCount).toBe(2);
  });

  it("returns zero counts on error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "rpc failed" },
    });

    const { result } = renderHook(() => useUsage(), { wrapper: createWrapper() });

    // On error, query throws, and defaults to 0
    await waitFor(() => {
      expect(result.current.submissionCount).toBe(0);
    });
  });

  it("returns default zeros while loading", () => {
    mockRpc.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useUsage(), { wrapper: createWrapper() });

    expect(result.current.submissionCount).toBe(0);
    expect(result.current.formCount).toBe(0);
    expect(result.current.memberCount).toBe(0);
  });

  it("calls rpc with workspace_id", async () => {
    const { result } = renderHook(() => useUsage(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockRpc).toHaveBeenCalledWith("get_workspace_usage", { ws_id: "ws-1" });
  });

  it("provides refetch function", async () => {
    const { result } = renderHook(() => useUsage(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
  });
});
