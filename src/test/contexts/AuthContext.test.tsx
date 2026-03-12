import { renderHook, act, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Use vi.hoisted to declare mock functions before vi.mock hoisting
const {
  mockUnsubscribe,
  mockOnAuthStateChange,
  mockGetSession,
  mockSignOut,
  mockSignInWithSSO,
} = vi.hoisted(() => ({
  mockUnsubscribe: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
  mockSignInWithSSO: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
      signInWithSSO: mockSignInWithSSO,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, null, createElement(AuthProvider, null, children))
    );
  };
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    }));
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("provides null session when not authenticated", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("provides session when authenticated", async () => {
    const mockSession = {
      user: { id: "user-1", email: "test@example.com" },
      access_token: "token-123",
    };
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.user).toEqual(mockSession.user);
  });

  it("shows loading state during session check", () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);
  });

  it("subscribes to auth state changes", () => {
    renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it("updates session on auth state change", async () => {
    const mockSession = {
      user: { id: "user-2", email: "user2@test.com" },
      access_token: "token-456",
    };

    let authCallback: (event: string, session: unknown) => void;
    mockOnAuthStateChange.mockImplementation((cb: (...args: unknown[]) => void) => {
      authCallback = cb as typeof authCallback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      authCallback!("SIGNED_IN", mockSession);
    });

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.user).toEqual(mockSession.user);
    expect(result.current.lastEvent).toBe("SIGNED_IN");
  });

  it("signOut calls supabase signOut", async () => {
    const mockSession = {
      user: { id: "user-1", email: "test@example.com" },
      access_token: "token-123",
    };
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
