import { render, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";

const { mockPlan } = vi.hoisted(() => ({
  mockPlan: { current: "free" as string },
}));

vi.mock("@/hooks/usePlanLimits", () => ({
  usePlanLimits: () => ({
    plan: mockPlan.current,
    isLoading: false,
  }),
}));

vi.mock("@/lib/stripe", () => ({
  isPlanAtLeast: (planA: string, planB: string) => {
    const order: Record<string, number> = { free: 0, pro: 1, growth: 2, business: 3 };
    return (order[planA] ?? 0) >= (order[planB] ?? 0);
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/components/upgrade/PaywallModal", () => ({
  default: () => <div data-testid="paywall-modal" />,
}));

import FeatureGate from "@/components/upgrade/FeatureGate";

describe("FeatureGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when user has required plan", () => {
    mockPlan.current = "growth";

    renderWithProviders(
      <FeatureGate feature="webhooks" requiredPlan="growth">
        <div data-testid="gated-content">Premium Feature</div>
      </FeatureGate>
    );

    expect(screen.getByTestId("gated-content")).toBeInTheDocument();
    expect(screen.getByText("Premium Feature")).toBeInTheDocument();
  });

  it("renders children when user has higher plan", () => {
    mockPlan.current = "business";

    renderWithProviders(
      <FeatureGate feature="webhooks" requiredPlan="growth">
        <div data-testid="gated-content">Premium Feature</div>
      </FeatureGate>
    );

    expect(screen.getByTestId("gated-content")).toBeInTheDocument();
  });

  it("renders blurred overlay when plan insufficient", () => {
    mockPlan.current = "free";

    renderWithProviders(
      <FeatureGate feature="webhooks" requiredPlan="growth">
        <div data-testid="gated-content">Premium Feature</div>
      </FeatureGate>
    );

    // The gated content should be blurred (rendered but behind overlay)
    const blurredContainer = document.querySelector(".blur-sm");
    expect(blurredContainer).toBeInTheDocument();
  });

  it("shows upgrade button when plan insufficient", () => {
    mockPlan.current = "free";

    renderWithProviders(
      <FeatureGate feature="webhooks" requiredPlan="growth">
        <div>Premium Feature</div>
      </FeatureGate>
    );

    // Should show upgrade button
    const upgradeButton = screen.getByRole("button");
    expect(upgradeButton).toBeInTheDocument();
  });

  it("renders fallback when provided and plan insufficient", () => {
    mockPlan.current = "free";

    renderWithProviders(
      <FeatureGate
        feature="webhooks"
        requiredPlan="growth"
        fallback={<div data-testid="fallback">Upgrade to access</div>}
      >
        <div data-testid="gated-content">Premium Feature</div>
      </FeatureGate>
    );

    expect(screen.getByTestId("fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("gated-content")).not.toBeInTheDocument();
  });

  it("shows lock icon in overlay", () => {
    mockPlan.current = "free";

    renderWithProviders(
      <FeatureGate feature="webhooks" requiredPlan="growth">
        <div>Premium Feature</div>
      </FeatureGate>
    );

    // Lock icon container
    const lockContainer = document.querySelector(".rounded-full.bg-muted");
    expect(lockContainer).toBeInTheDocument();
  });
});
