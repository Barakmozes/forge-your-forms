import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const {
  mockGetSession,
  mockOnAuthStateChange,
  mockOrder,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockOrder: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: mockOrder,
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithSSO: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";

function setupAuth(mockUser: unknown = null) {
  if (mockUser) {
    const session = { user: mockUser, access_token: "tok" };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockOnAuthStateChange.mockImplementation((cb: (...args: unknown[]) => void) => {
      setTimeout(() => cb("SIGNED_IN", session), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  } else {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockImplementation((cb: (...args: unknown[]) => void) => {
      setTimeout(() => cb("SIGNED_OUT", null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  }
}

function createWrapper(mockUser: unknown = null) {
  setupAuth(mockUser);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        null,
        createElement(
          AuthProvider,
          null,
          createElement(WorkspaceProvider, null, children)
        )
      )
    );
  };
}

describe("WorkspaceContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
  });

  it("returns empty workspaces when not authenticated", async () => {
    const { result } = renderHook(() => useWorkspace(), {
      wrapper: createWrapper(null),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.workspaces).toEqual([]);
    expect(result.current.currentWorkspace).toBeNull();
  });

  it("loads workspaces for authenticated user", async () => {
    const workspaces = [
      { id: "ws-1", name: "Workspace 1", owner_id: "u1", created_at: "2024-01-01" },
      { id: "ws-2", name: "Workspace 2", owner_id: "u1", created_at: "2024-01-02" },
    ];
    mockOrder.mockResolvedValue({ data: workspaces, error: null });

    const { result } = renderHook(() => useWorkspace(), {
      wrapper: createWrapper({ id: "u1", email: "test@example.com" }),
    });

    await waitFor(() => {
      expect(result.current.workspaces).toHaveLength(2);
    });
  });

  it("auto-selects first workspace", async () => {
    const workspaces = [
      { id: "ws-1", name: "First WS", owner_id: "u1", created_at: "2024-01-01" },
      { id: "ws-2", name: "Second WS", owner_id: "u1", created_at: "2024-01-02" },
    ];
    mockOrder.mockResolvedValue({ data: workspaces, error: null });

    const { result } = renderHook(() => useWorkspace(), {
      wrapper: createWrapper({ id: "u1", email: "test@example.com" }),
    });

    await waitFor(() => {
      expect(result.current.currentWorkspace).not.toBeNull();
    });

    expect(result.current.currentWorkspace?.id).toBe("ws-1");
    expect(result.current.currentWorkspace?.name).toBe("First WS");
  });

  it("provides setCurrentWorkspace function", async () => {
    const workspaces = [
      { id: "ws-1", name: "First WS", owner_id: "u1", created_at: "2024-01-01" },
    ];
    mockOrder.mockResolvedValue({ data: workspaces, error: null });

    const { result } = renderHook(() => useWorkspace(), {
      wrapper: createWrapper({ id: "u1", email: "test@example.com" }),
    });

    await waitFor(() => {
      expect(result.current.currentWorkspace).not.toBeNull();
    });

    expect(typeof result.current.setCurrentWorkspace).toBe("function");
  });
});
