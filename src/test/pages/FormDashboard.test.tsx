import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockSingle } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
      signInWithSSO: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: { submission_count: 0, form_count: 1, member_count: 1 }, error: null }),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock child dashboard components
vi.mock("@/components/waitlist/WaitlistDashboard", () => ({
  default: () => <div data-testid="waitlist-dashboard">WaitlistDashboard</div>,
}));

vi.mock("@/components/feedback/FeedbackDashboard", () => ({
  default: () => <div data-testid="feedback-dashboard">FeedbackDashboard</div>,
}));

vi.mock("@/components/support/SupportDashboard", () => ({
  default: () => <div data-testid="support-dashboard">SupportDashboard</div>,
}));

vi.mock("@/components/upgrade/UpgradePrompt", () => ({
  default: ({ featureName }: { featureName: string }) => (
    <div data-testid="upgrade-prompt">Upgrade: {featureName}</div>
  ),
}));

vi.mock("@/components/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock usePlanLimits — allow all modes by default
const mockCanAccessMode = vi.fn().mockReturnValue(true);
vi.mock("@/hooks/usePlanLimits", () => ({
  usePlanLimits: () => ({
    plan: "business",
    canAccessMode: mockCanAccessMode,
    canCreateForm: vi.fn().mockReturnValue(true),
    canAcceptSubmission: vi.fn().mockReturnValue(true),
    canInviteMember: vi.fn().mockReturnValue(true),
    canAccessFeature: vi.fn().mockReturnValue(true),
    limits: {},
    usage: { submissionCount: 0, formCount: 1, memberCount: 1 },
    submissionPercentUsed: 0,
    isNearLimit: false,
    isAtLimit: false,
    isLoading: false,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

import FormDashboard from "@/pages/FormDashboard";

function renderDashboard(formId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/forms/${formId}`]}>
        <Routes>
          <Route path="/forms/:id" element={<FormDashboard />} />
          <Route path="/forms/:id/edit" element={<div data-testid="form-builder">FormBuilder</div>} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("FormDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanAccessMode.mockReturnValue(true);
  });

  it("routes to WaitlistDashboard for waitlist mode", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "f1", title: "My Waitlist", description: null, mode: "waitlist", status: "active", submission_count: 5, settings: {} },
      error: null,
    });

    renderDashboard("f1");

    await waitFor(() => {
      expect(screen.getByTestId("waitlist-dashboard")).toBeInTheDocument();
    });
  });

  it("routes to FeedbackDashboard for feedback mode", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "f2", title: "My Feedback", description: null, mode: "feedback", status: "active", submission_count: 10, settings: {} },
      error: null,
    });

    renderDashboard("f2");

    await waitFor(() => {
      expect(screen.getByTestId("feedback-dashboard")).toBeInTheDocument();
    });
  });

  it("routes to SupportDashboard for support mode", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "f3", title: "My Support", description: null, mode: "support", status: "active", submission_count: 3, settings: {} },
      error: null,
    });

    renderDashboard("f3");

    await waitFor(() => {
      expect(screen.getByTestId("support-dashboard")).toBeInTheDocument();
    });
  });

  it("navigates to form builder for standard mode", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "f4", title: "My Form", description: null, mode: "standard", status: "active", submission_count: 0, settings: {} },
      error: null,
    });

    renderDashboard("f4");

    await waitFor(() => {
      expect(screen.getByTestId("form-builder")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    mockSingle.mockReturnValue(new Promise(() => {}));

    renderDashboard("f5");

    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("displays form title after loading", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "f6", title: "Dashboard Title Test", description: null, mode: "waitlist", status: "active", submission_count: 0, settings: {} },
      error: null,
    });

    renderDashboard("f6");

    await waitFor(() => {
      expect(screen.getByText("Dashboard Title Test")).toBeInTheDocument();
    });
  });
});
