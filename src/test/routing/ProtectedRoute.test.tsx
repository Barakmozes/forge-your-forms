import { render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock supabase
const { mockGetSession, mockOnAuthStateChange } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithSSO: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
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
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

// Re-implement route guards matching App.tsx logic
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function setupMocks(mockSession: unknown) {
  if (mockSession) {
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    mockOnAuthStateChange.mockImplementation((cb: (...args: unknown[]) => void) => {
      setTimeout(() => cb("SIGNED_IN", mockSession), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  } else {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockOnAuthStateChange.mockImplementation((cb: (...args: unknown[]) => void) => {
      setTimeout(() => cb("SIGNED_OUT", null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  }
}

function renderWithAuth(initialRoute: string, mockSession: unknown = null) {
  setupMocks(mockSession);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/" element={<div>Home Page</div>} />
              <Route
                path="/auth"
                element={
                  <AuthRoute>
                    <div>Auth Page</div>
                  </AuthRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div>Dashboard Page</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when authenticated", async () => {
    const session = { user: { id: "u1", email: "test@example.com" }, access_token: "tok" };
    renderWithAuth("/dashboard", session);

    await waitFor(() => {
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    });
  });

  it("redirects to /auth when not authenticated", async () => {
    renderWithAuth("/dashboard", null);

    await waitFor(() => {
      expect(screen.getByText("Auth Page")).toBeInTheDocument();
    });
  });
});

describe("AuthRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when not authenticated", async () => {
    renderWithAuth("/auth", null);

    await waitFor(() => {
      expect(screen.getByText("Auth Page")).toBeInTheDocument();
    });
  });

  it("redirects to / when already authenticated", async () => {
    const session = { user: { id: "u1", email: "test@example.com" }, access_token: "tok" };
    renderWithAuth("/auth", session);

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
  });
});
