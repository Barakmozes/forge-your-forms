import { render, type RenderOptions } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

/**
 * Mock Supabase client factory.
 * Returns an object that mimics the supabase client with chainable query methods.
 */
export function createMockSupabaseClient() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  return {
    from: vi.fn(() => chainable),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signInWithSSO: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    _chainable: chainable,
  };
}

/**
 * Create a fresh QueryClient for tests (no retries, no caching).
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

/**
 * Render helper that wraps components in all required providers:
 * QueryClientProvider, MemoryRouter.
 *
 * Auth and Workspace contexts are NOT included here because they depend on
 * Supabase — mock them individually in tests that need them.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { route?: string }
) {
  const queryClient = createTestQueryClient();
  const route = options?.route ?? "/";

  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [route] }, children)
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient };
}

// ============================================
// Factory Functions for Test Data
// ============================================

let _idCounter = 0;
function mockId() {
  _idCounter += 1;
  return `mock-id-${_idCounter}`;
}

export function createMockUser(overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    email: "test@example.com",
    full_name: "Test User",
    avatar_url: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockWorkspace(overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    name: "Test Workspace",
    slug: "test-workspace",
    owner_id: mockId(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockForm(overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    title: "Test Form",
    description: "A test form",
    fields: [],
    settings: {},
    branding: {},
    status: "draft" as const,
    mode: "standard" as const,
    submission_count: 0,
    created_by: mockId(),
    workspace_id: mockId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockSubmission(formId: string, overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    form_id: formId,
    data: {},
    submitted_by_email: "submitter@example.com",
    submitted_by_name: "Submitter",
    metadata: {},
    status: "completed",
    submitted_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockWaitlistEntry(formId: string, overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    form_id: formId,
    email: "waitlist@example.com",
    name: "Waitlist User",
    referral_code: "ABCD1234",
    referred_by: null,
    position: 1,
    referral_count: 0,
    status: "waiting" as const,
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockFeedbackResponse(formId: string, overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    form_id: formId,
    submission_id: null,
    respondent_email: "feedback@example.com",
    respondent_name: "Feedback User",
    nps_score: 8,
    category: "general",
    sentiment: "passive" as const,
    follow_up: null,
    custom_answers: {},
    flagged: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockTicket(formId: string, overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    form_id: formId,
    ticket_number: "TICK-001",
    subject: "Test Ticket",
    description: "A test ticket description",
    status: "open" as const,
    priority: "medium" as const,
    category: null,
    assigned_to: null,
    submitted_by_email: "customer@example.com",
    submitted_by_name: "Customer",
    first_response_at: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockTicketMessage(ticketId: string, overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    ticket_id: ticketId,
    sender_type: "customer" as const,
    sender_name: "Customer",
    sender_email: "customer@example.com",
    message: "Test message",
    is_internal: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockNotification(userId: string, overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    user_id: userId,
    type: "info",
    title: "Test Notification",
    message: "This is a test notification",
    link: null,
    read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockSubscription(workspaceId: string, overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    workspace_id: workspaceId,
    plan: "pro",
    status: "active",
    stripe_customer_id: "cus_test123",
    stripe_subscription_id: "sub_test123",
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
